import { runCompletionStep } from "../../../sprint/steps/completion-step.js";
import type { SprintAgentArgs } from "../../../sprint/sprint-types.js";
import { determineNextState, WatchLoopState } from "./watch-loop-state-machine.js";
import type {
  AutomationInterventionsSettings,
  AutomationLevel,
  CiIntelligenceSettings,
  SprintLoopStepSettings,
} from "../../../contracts/app-types.js";
import type { SprintOrchestratorDependencies } from "../../../sprint/sprint-orchestrator.js";
import type { CycleRunner } from "./cycle-runner.js";
import type { SprintExecutionContext } from "../../../services/sprint-execution-state-service.js";

export interface WatchLoopRunnerArgs {
  args: SprintAgentArgs;
  executionContext: SprintExecutionContext;
  repoPath: string;
  defaultFeatureBranch: string;
  defaultBranch: string;
  githubMode: "REMOTE" | "LOCAL";
  retryFailed: boolean;
  loopSteps: SprintLoopStepSettings;
  ciIntelligence: CiIntelligenceSettings;
  automationLevel: AutomationLevel;
  automationInterventions: AutomationInterventionsSettings;
  dashboardPort: number;
  sprintRunId: string;
  leaseToken?: string;
}

export class WatchLoopRunner {
  constructor(
    private readonly deps: SprintOrchestratorDependencies,
    private readonly cycleRunner: CycleRunner,
    private readonly renderMainMergeCiFeedback: (args: any) => Promise<string>
  ) {}

  async run(params: WatchLoopRunnerArgs): Promise<string> {
    const {
      args,
      executionContext,
      repoPath,
      defaultFeatureBranch,
      defaultBranch,
      githubMode,
      retryFailed,
      loopSteps,
      ciIntelligence,
      automationLevel,
      automationInterventions,
      dashboardPort,
      sprintRunId,
      leaseToken,
    } = params;
    const scopedExecutionContext = executionContext || {
      project: { id: "unknown-project", name: "Selected Project" },
      sprint: { id: "unknown-sprint", name: "Selected Sprint" },
      sprintNumber: args.sprint_number ?? 0,
      repoPath,
      featureBranch: defaultFeatureBranch,
      defaultBranch,
      sourceId: args.source_id,
    };

    let allFinished = false;
    const watchStartedAt = Date.now();
    let fullReport = await this.deps.renderInstruction(
      "watchHeader",
      {
        sprint_number: scopedExecutionContext.sprintNumber,
        feature_branch: defaultFeatureBranch,
        dashboard_port: dashboardPort,
      },
      repoPath
    );
    fullReport += "\n";

    const watchLoopIntervalMs = Math.max(1, loopSteps.watchLoopIntervalSeconds) * 1000;
    const watchLoopOutputIntervalMs = Math.max(60, loopSteps.watchLoopOutputIntervalSeconds) * 1000;

    this.deps.logger.info("Starting watch loop", {
      sprintNumber: scopedExecutionContext.sprintNumber,
      featureBranch: defaultFeatureBranch,
    });
    this.deps.logger.info(`Live dashboard available at http://localhost:${dashboardPort}`);

    while (!allFinished) {
      const { subtasks, reportText, statusTable, instructions, awaitingMerge } = await this.cycleRunner.run({
        action: args.action as "status" | "orchestrate",
        automationLevel,
        automationInterventions,
        executionContext: scopedExecutionContext,
        repoPath,
        defaultFeatureBranch,
        retryFailed,
        loopSteps,
        ciIntelligence,
        githubMode,
        defaultBranch,
        featureBranchPrefix: this.deps.getDashboardSettings().git.featureBranchPrefix,
        sprintRunId,
      });

      const timestamp = new Date().toLocaleTimeString();
      this.deps.updateLastStatus({
        project_id: scopedExecutionContext.project.id,
        sprint_id: scopedExecutionContext.sprint.id,
        sprint_number: scopedExecutionContext.sprintNumber,
        source_id: args.source_id,
        repo_path: repoPath,
        feature_branch: defaultFeatureBranch,
        subtasks,
        reportText,
        statusTable,
        instructions,
        timestamp,
      });

      const runningTasks = subtasks.filter((task) => task.status === "RUNNING");
      const readyTasks = subtasks.filter((task) => task.status === "PENDING" && task.is_independent);

      const allTerminal = subtasks.length > 0 && subtasks.every(
        (task) => (task.status === "COMPLETED" && task.is_merged) || task.status === "FAILED"
      );
      const noMoreActionPossible = runningTasks.length === 0 && readyTasks.length === 0;
      const needsManualMerge = awaitingMerge.length > 0;

      allFinished = allTerminal || noMoreActionPossible || needsManualMerge;
      const elapsedMs = Date.now() - watchStartedAt;
      const outputIntervalReached = elapsedMs >= watchLoopOutputIntervalMs;

      const nextState = determineNextState({
        allFinished,
        outputIntervalReached,
      });

      switch (nextState) {
        case WatchLoopState.FINISHED: {
          fullReport += reportText;
          fullReport += statusTable;
          fullReport += instructions;

          if (needsManualMerge) {
            fullReport += await this.deps.renderInstruction("watchMergeRequired", {}, repoPath);
          } else if (subtasks.length > 0 && !allTerminal && noMoreActionPossible) {
            fullReport += await this.deps.renderInstruction("watchNoMoreActions", {}, repoPath);
          }

          try {
            const watchGuide = await this.deps.getGuideContent("watch.md", repoPath);
            fullReport += `\n---\n\n### Watch Loop Operating Standard\n\n${watchGuide}`;
          } catch {
            // Guide is optional.
          }

          if (subtasks.length > 0 && subtasks.every((task) => task.status === "COMPLETED" && task.is_merged)) {
            try {
              this.deps.completedSprints.add(`${scopedExecutionContext.project.id}:${scopedExecutionContext.sprint.id}`);
              this.deps.executionRepository.updateSprintRun(sprintRunId, {
                status: "completed",
                finishedAt: new Date().toISOString(),
                lastHeartbeatAt: new Date().toISOString(),
              });
              fullReport += await this.deps.renderInstruction("cleanupAllMerged", { planning_target: scopedExecutionContext.sprint.name }, repoPath);
              fullReport += await runCompletionStep({
                defaultBranch,
                featureBranch: defaultFeatureBranch,
                sprintNumber: scopedExecutionContext.sprintNumber,
                githubMode,
                ciIntelligence,
                renderInstruction: (templateId, variables) => this.deps.renderInstruction(templateId, variables, repoPath),
              });
              fullReport += await this.renderMainMergeCiFeedback({
                repoPath,
                featureBranch: defaultFeatureBranch,
                defaultBranch,
                featureBranchPrefix: this.deps.getDashboardSettings().git.featureBranchPrefix,
                ciIntelligence,
                githubMode,
              });
            } catch (cleanupError) {
              this.deps.logger.warn("Failed to finalize sprint run", {
                sprintRunId,
                error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
              });
            }
          } else if (subtasks.some((task) => task.status === "FAILED")) {
            this.deps.executionRepository.updateSprintRun(sprintRunId, {
              status: "failed",
              finishedAt: new Date().toISOString(),
              lastHeartbeatAt: new Date().toISOString(),
            });
            fullReport += await this.deps.renderInstruction("cleanupFailed", { planning_target: scopedExecutionContext.sprint.name }, repoPath);
          } else if (subtasks.some((task) => task.status === "COMPLETED" && !task.is_merged)) {
            this.deps.executionRepository.updateSprintRun(sprintRunId, {
              status: "paused",
              lastHeartbeatAt: new Date().toISOString(),
            });
            fullReport += await this.deps.renderInstruction("cleanupDeferred", {}, repoPath);
          } else if (subtasks.length === 0) {
            this.deps.executionRepository.updateSprintRun(sprintRunId, {
              status: "cancelled",
              finishedAt: new Date().toISOString(),
              lastHeartbeatAt: new Date().toISOString(),
            });
            fullReport += await this.renderInstruction("cleanupEmpty", {}, repoPath);
          } else {
            this.deps.executionRepository.updateSprintRun(sprintRunId, {
              status: "paused",
              lastHeartbeatAt: new Date().toISOString(),
            });
          }

          fullReport += "\n✅ **Sprint Execution Finished.**\n";
          return fullReport;
        }

        case WatchLoopState.CHECKPOINT: {
          const pendingTasks = subtasks.filter((task) => task.status === "PENDING");
          const completedTasks = subtasks.filter((task) => task.status === "COMPLETED");
          const failedTasks = subtasks.filter((task) => task.status === "FAILED");

          fullReport += reportText;
          fullReport += statusTable;
          fullReport += instructions;
          fullReport += await this.deps.renderInstruction(
            "watchContinue",
            {
              elapsed_seconds: Math.floor(elapsedMs / 1000),
              action: args.action,
              running_tasks: runningTasks.length,
              pending_tasks: pendingTasks.length,
              completed_tasks: completedTasks.length,
              failed_tasks: failedTasks.length,
            },
            repoPath
          );
          return fullReport;
        }

        case WatchLoopState.RUNNING: {
          const now = new Date().toISOString();
          this.deps.executionRepository.updateSprintRun(sprintRunId, {
            status: "running",
            lastHeartbeatAt: now,
          });
          if (leaseToken) {
            this.deps.executionRepository.renewLease({
              scopeType: "sprint",
              scopeId: scopedExecutionContext.sprint.id,
              leaseToken,
              expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            });
          }
          await new Promise((resolve) => setTimeout(resolve, watchLoopIntervalMs));
          break;
        }
      }
    }

    return fullReport;
  }

  private async renderInstruction(
    templateId: any,
    variables: Record<string, unknown>,
    repoPath?: string
  ): Promise<string> {
    return await this.deps.renderInstruction(templateId, variables, repoPath);
  }
}
