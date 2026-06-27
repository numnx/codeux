import { runCompletionStep } from "../../../sprint/steps/completion-step.js";
import type { SprintAgentArgs } from "../../../sprint/sprint-types.js";
import { getCheckedOutRef, mergeBranchLocally, restoreCheckedOutRef } from "../../../infrastructure/git/local-merge.js";
import { determineNextState, WatchLoopState } from "./watch-loop-state-machine.js";
import type { Subtask,
  AutomationInterventionsSettings,
  AutomationLevel,
  CiIntelligenceSettings,
  DashboardSettings,
  DashboardSettingsScope,
  SprintLoopStepSettings,
  DashboardStatusSnapshot,
 } from "../../../contracts/app-types.js";
import type { InstructionTemplateId } from "../../../instructions/instruction-template-catalog.js";
import type { MemoryPromotionService } from "../../../services/memory-promotion-service.js";
import type { QualityAssuranceService } from "../../../services/quality-assurance-service.js";
import type { Logger } from "../../../shared/logging/logger.js";
import type { ExecutionRepository } from "../../../repositories/execution-repository.js";
import type { ProjectAttentionService } from "../../workers/project-attention-service.js";
import type { CycleRunner } from "./cycle-runner.js";
import type { SprintExecutionContext } from "../../../services/sprint-execution-state-service.js";
import type { MergeFeedbackResult } from "../ci/main-merge-gate.js";
import type { ProjectAttentionItemRecord } from "../../../contracts/project-attention-types.js";
import { isCompletedTaskSettled } from "../task-merge-state.js";
import { transitionSprintRun } from "./sprint-run-transitions.js";
import { buildTaskAttentionPayload } from "./attention-payload-builder.js";
import { decideMainMergeWaitOrPause, decideTerminalCompletion, isHumanEscalatedAttentionItem } from "./watch-loop-policies.js";
import { decideFinalizationTransition } from "./watch-loop-finalization-policy.js";
import { buildConflictSummaryMarkdown, selectMergedTaskContexts } from "./conflict-summary-utils.js";
import { WorkspaceManager } from "../../../infrastructure/providers/cli/workspace-manager.js";
import { SprintFinalizationService } from "./sprint-finalization-service.js";
import { evaluateSprintRunState, isMainMergeAttentionItem } from "./sprint-state-evaluator.js";
import type { HeartbeatService } from "../../../services/heartbeat-service.js";
import type { SprintIssueService } from "../../../services/sprint-issue-service.js";


export type WatchLoopExecutionDependencies = Pick<ExecutionRepository, "appendSprintRunEvent" | "finalizeSprintRunCancellationIfIdle" | "getSprintRun" | "getTaskRunByDispatchId" | "listTaskDispatches" | "listTaskRunEvents" | "updateSprintRun" | "renewLease">;
export type WatchLoopAttentionDependencies = Pick<ProjectAttentionService, "listActiveProjectItems" | "openItems" | "resolveItemsForSprintRun" | "resolveItem">;

export interface WatchLoopDependencies {
  logger: Logger;
  completedSprints: Set<string>;
  sleep?: (ms: number) => Promise<void>;
  getDashboardSettings: (scope?: DashboardSettingsScope) => DashboardSettings;
  renderInstruction: (templateId: InstructionTemplateId, variables: Record<string, unknown>, repoPath?: string) => Promise<string>;
  updateLastStatus: (status: DashboardStatusSnapshot) => void;
  resolvePlanningAgentPresetId?: (projectId: string) => Promise<string | undefined>;
  memoryPromotionService?: MemoryPromotionService;
  qualityAssuranceService?: QualityAssuranceService;
  sprintIssueService?: SprintIssueService;
  executionRepository: WatchLoopExecutionDependencies;
  projectAttentionService: WatchLoopAttentionDependencies;
  heartbeatService: HeartbeatService;
  workspaceManager: WorkspaceManager;
}

export interface WatchLoopRunnerArgs {
  args: SprintAgentArgs;
  executionContext: SprintExecutionContext;
  repoPath: string;
  defaultFeatureBranch: string;
  defaultBranch: string;
  featureBranchPrefix: string;
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
  private readonly sprintFinalizationService: SprintFinalizationService;
  constructor(
    private readonly deps: WatchLoopDependencies,
    private readonly cycleRunner: CycleRunner,
    private readonly renderMainMergeCiFeedback: (args: {
      repoPath: string;
      featureBranch: string;
      defaultBranch: string;
      featureBranchPrefix: string;
      sprintNumber?: number;
      sprintName?: string;
      sprintDescription?: string;
      ciIntelligence: CiIntelligenceSettings;
      githubMode: "REMOTE" | "LOCAL";
      subtasks?: Subtask[];
    }) => Promise<MergeFeedbackResult>
  ) {
    this.sprintFinalizationService = new SprintFinalizationService(
      this.deps,
      this.renderMainMergeCiFeedback,
      this.triggerAutoPromote.bind(this)
    );}

  private async sleep(ms: number): Promise<void> {
    if (typeof this.deps.sleep === "function") {
      await this.deps.sleep(ms);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async run(params: WatchLoopRunnerArgs): Promise<string> {
    const {
      args,
      executionContext,
      repoPath,
      defaultFeatureBranch,
      defaultBranch,
      featureBranchPrefix,
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

    const planningAgentPresetId = await this.deps.resolvePlanningAgentPresetId?.(scopedExecutionContext.project.id);

    let allFinished = false;
    let checkpointWindowStartedAt = Date.now();
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
    this.deps.executionRepository.appendSprintRunEvent(sprintRunId, "watch_loop_started", "system", {
      sprintNumber: scopedExecutionContext.sprintNumber,
      featureBranch: defaultFeatureBranch,
      defaultBranch,
    }, {
      sourceEventKey: `watch-loop-started:${sprintRunId}`,
    });

    this.deps.heartbeatService.startHeartbeat(sprintRunId, scopedExecutionContext.sprint.id, leaseToken);
    try {
      while (!allFinished) {
      const controlEval = this.evaluateControlIntervention(sprintRunId);
      if (controlEval.status === "exit") {
        fullReport += controlEval.report;
        return fullReport;
      }

      const cycleResult = await this.handleCycleTransition({
        args,
        scopedExecutionContext,
        repoPath,
        defaultFeatureBranch,
        defaultBranch,
        featureBranchPrefix,
        githubMode,
        retryFailed,
        loopSteps,
        ciIntelligence,
        automationLevel,
        automationInterventions,
        sprintRunId,
        planningAgentPresetId,
      });

      const {
        subtasks,
        reportText,
        statusTable,
        instructions,
        manualMergeTasks,
        workerEscalatedMergeConflictTasks,
      } = cycleResult;

      const activeProjectAttentionItems = typeof this.deps.projectAttentionService?.listActiveProjectItems === "function"
        ? this.deps.projectAttentionService.listActiveProjectItems(scopedExecutionContext.project.id).filter((item) => (
          item.status === "open" || item.status === "claimed"
        ))
        : [];

      const {
        runningTasks,
        readyTasks,
        activeMainMergeAttentionItems,
        allTerminal,
        noMoreActionPossible,
        needsManualMerge,
        allFinished: evaluatedAllFinished,
      } = evaluateSprintRunState({
        subtasks,
        manualMergeTasks,
        workerEscalatedMergeConflictTasks,
        activeProjectAttentionItems,
        sprintRunId,
        githubMode,
      });

      allFinished = evaluatedAllFinished;
      const elapsedMs = Date.now() - checkpointWindowStartedAt;
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
          const finalizationResult = await this.finalizeSprintRun({
            scopedExecutionContext,
            sprintRunId,
            repoPath,
            defaultFeatureBranch,
            defaultBranch,
            featureBranchPrefix,
            githubMode,
            ciIntelligence,
            subtasks,
            runningTasks,
            readyTasks,
            manualMergeTasks,
            needsManualMerge,
            allTerminal,
            noMoreActionPossible,
            activeMainMergeAttentionItems,
          });
          fullReport += finalizationResult.report;
          if (finalizationResult.status === "exit") {
            return fullReport;
          }
          if (finalizationResult.status === "wait") {
            checkpointWindowStartedAt = Date.now();
            allFinished = false;
            await this.sleep(watchLoopIntervalMs);
            break;
          }
          fullReport += "\n✅ **Sprint Execution Finished.**\n";
          return fullReport;
        }

        case WatchLoopState.CHECKPOINT: {
          checkpointWindowStartedAt = Date.now();
          await this.sleep(watchLoopIntervalMs);
          break;
        }

        case WatchLoopState.RUNNING: {
          await this.sleep(watchLoopIntervalMs);
          break;
        }
      }
    }

    } finally {
      this.deps.heartbeatService.stopHeartbeat(sprintRunId);
    }
    return fullReport;
  }

  private triggerAutoPromote(projectId: string, sprintId: string): void {
    const promotionService = this.deps.memoryPromotionService;
    if (!promotionService) return;

    const settings = this.deps.getDashboardSettings({ projectId, sprintId });
    if (!settings.memory?.enabled || !settings.memory.autoPromote) return;

    promotionService.autoPromoteFromSprint(projectId, sprintId, settings.memory).catch((err) => {
      this.deps.logger.warn("Failed to auto-promote sprint memories", {
        projectId,
        sprintId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  private async renderInstruction(
    templateId: any,
    variables: Record<string, unknown>,
    repoPath?: string
  ): Promise<string> {
    return await this.deps.renderInstruction(templateId, variables, repoPath);
  }

  private evaluateControlIntervention(sprintRunId: string): { status: "continue" } | { status: "exit", report: string } {
    const controlledRun = this.deps.executionRepository.getSprintRun(sprintRunId);
    if (controlledRun?.status === "paused") {
      return { status: "exit", report: "\n⏸️ **Sprint Paused:** Dashboard control paused this sprint run.\n" };
    }
    if (controlledRun?.status === "cancel_requested") {
      const finalized = this.deps.executionRepository.finalizeSprintRunCancellationIfIdle(sprintRunId);
      return {
        status: "exit",
        report: finalized
          ? "\n🛑 **Sprint Cancelled:** Dashboard control cancelled this sprint run.\n"
          : "\n🛑 **Sprint Cancellation Requested:** Dashboard control requested cancellation for this sprint run. Active work is still shutting down.\n"
      };
    }
    if (controlledRun?.status === "cancelled") {
      return { status: "exit", report: "\n🛑 **Sprint Cancelled:** Dashboard control cancelled this sprint run.\n" };
    }
    return { status: "continue" };
  }

  private async handleCycleTransition(params: {
    args: SprintAgentArgs;
    scopedExecutionContext: SprintExecutionContext & { sprintNumber: number };
    repoPath: string;
    defaultFeatureBranch: string;
    defaultBranch: string;
    featureBranchPrefix: string;
    githubMode: "REMOTE" | "LOCAL";
    retryFailed: boolean;
    loopSteps: SprintLoopStepSettings;
    ciIntelligence: CiIntelligenceSettings;
    automationLevel: AutomationLevel;
    automationInterventions: AutomationInterventionsSettings;
    sprintRunId: string;
    planningAgentPresetId?: string;
  }) {
    const cycleResult = await this.cycleRunner.run({
      action: params.args.action as "status" | "orchestrate",
      automationLevel: params.automationLevel,
      automationInterventions: params.automationInterventions,
      executionContext: params.scopedExecutionContext,
      repoPath: params.repoPath,
      defaultFeatureBranch: params.defaultFeatureBranch,
      retryFailed: params.retryFailed,
      loopSteps: params.loopSteps,
      ciIntelligence: params.ciIntelligence,
      githubMode: params.githubMode,
      defaultBranch: params.defaultBranch,
      featureBranchPrefix: params.featureBranchPrefix,
      sprintRunId: params.sprintRunId,
      planningAgentPresetId: params.planningAgentPresetId,
    });

    const timestamp = new Date().toLocaleTimeString();
    this.deps.updateLastStatus({
      project_id: params.scopedExecutionContext.project.id,
      sprint_id: params.scopedExecutionContext.sprint.id,
      sprint_number: params.scopedExecutionContext.sprintNumber,
      source_id: params.args.source_id,
      repo_path: params.repoPath,
      feature_branch: params.defaultFeatureBranch,
      subtasks: cycleResult.subtasks,
      reportText: cycleResult.reportText,
      statusTable: cycleResult.statusTable,
      instructions: cycleResult.instructions,
      timestamp,
    } as DashboardStatusSnapshot);

    return cycleResult;
  }

  private async finalizeSprintRun(params: {
    scopedExecutionContext: SprintExecutionContext & { sprintNumber: number };
    sprintRunId: string;
    repoPath: string;
    defaultFeatureBranch: string;
    defaultBranch: string;
    featureBranchPrefix: string;
    githubMode: "REMOTE" | "LOCAL";
    ciIntelligence: CiIntelligenceSettings;
    subtasks: Subtask[];
    runningTasks: Subtask[];
    readyTasks: Subtask[];
    manualMergeTasks: Subtask[];
    needsManualMerge: boolean;
    allTerminal: boolean;
    noMoreActionPossible: boolean;
    activeMainMergeAttentionItems: Array<{ id: string; sprintRunId: string | null; attentionType: string; ownerType?: string; status?: string; summaryMarkdown: string; payload: Record<string, unknown> | null }>;
  }): Promise<{ status: "continue" | "exit" | "wait"; report: string }> {
    return this.sprintFinalizationService.finalize(params);
  }

  }
/**
 * Classifies a main-merge attention item by the blocker it addresses, looking through
 * escalation handoffs (which carry the original type on `payload.sourceAttentionType`).
 * Returns null for items that are not main-merge blockers.
 */
function mainMergeAttentionItemKind(
  item: { attentionType: string; payload: Record<string, unknown> | null },
): "merge_conflict" | "ci_fix_required" | null {
  if (!isMainMergeAttentionItem(item)) {
    return null;
  }
  if (item.attentionType === "merge_conflict") {
    return "merge_conflict";
  }
  if (item.attentionType === "ci_fix_required") {
    return "ci_fix_required";
  }
  const source = (item.payload || {}).sourceAttentionType;
  if (source === "merge_conflict") {
    return "merge_conflict";
  }
  if (source === "ci_fix_required") {
    return "ci_fix_required";
  }
  return null;
}

function resolveMainMergeAttentionItems(
  projectAttentionService: {
    listActiveProjectItems: (projectId: string) => Array<{
      id: string;
      sprintRunId: string | null;
      attentionType: string;
      summaryMarkdown: string;
      payload: Record<string, unknown> | null;
    }>;
    resolveItem: (itemId: string, input?: {
      status?: "resolved" | "dismissed" | "expired";
      reason?: string;
      resolutionSummaryMarkdown?: string;
      workerEndpointId?: string | null;
      payloadPatch?: Record<string, unknown> | null;
    }) => unknown;
  },
  projectId: string,
  sprintRunId: string,
  options: {
    kinds: Array<"merge_conflict" | "ci_fix_required">;
    reason: string;
    note: string;
  },
): void {
  const activeItems = projectAttentionService.listActiveProjectItems(projectId);
  for (const item of activeItems) {
    if (item.sprintRunId !== sprintRunId) {
      continue;
    }
    const kind = mainMergeAttentionItemKind(item);
    if (!kind || !options.kinds.includes(kind)) {
      continue;
    }

    projectAttentionService.resolveItem(item.id, {
      status: "resolved",
      reason: options.reason,
      resolutionSummaryMarkdown: [
        item.summaryMarkdown.trim(),
        "",
        options.note,
      ].filter(Boolean).join("\n"),
    });
  }
}

function collectActiveMainMergeAttentionItems(
  projectAttentionService: {
    listActiveProjectItems: (projectId: string) => Array<{
      id: string;
      sprintRunId: string | null;
      attentionType: string;
      ownerType?: string;
      status?: string;
      summaryMarkdown: string;
      payload: Record<string, unknown> | null;
    }>;
  },
  projectId: string,
  sprintRunId: string,
): Array<{
  id: string;
  sprintRunId: string | null;
  attentionType: string;
  summaryMarkdown: string;
  payload: Record<string, unknown> | null;
}> {
  return projectAttentionService.listActiveProjectItems(projectId).filter((item) => (
    item.sprintRunId === sprintRunId && isMainMergeAttentionItem(item)
  ));
}

function buildMainMergeConflictSummary(args: {
  repoPath: string;
  featureBranch: string;
  defaultBranch: string;
  prNumber: number | null;
  prUrl: string | null;
  mergedTaskContexts: Array<{
    taskKey: string;
    taskTitle: string;
    taskPrompt: string;
    workerBranch: string | null;
    prUrl: string | null;
  }>;
}): string {
  return buildConflictSummaryMarkdown({
    repoPath: args.repoPath,
    workingDir: `cd ${args.repoPath}`,
    conflictingBranches: {
      source: args.featureBranch,
      target: args.defaultBranch,
    },
    prInfo: {
      number: args.prNumber,
      url: args.prUrl,
    },
    mergedTaskContexts: args.mergedTaskContexts,
    isMainMerge: true,
  });
}

function buildMainMergeCiFixSummary(args: {
  featureBranch: string;
  defaultBranch: string;
  prNumber: number | null;
  prUrl: string | null;
  failedChecks: string[];
  mergedTaskContexts: Array<{
    taskKey: string;
    taskTitle: string;
    workerBranch: string | null;
    prUrl: string | null;
  }>;
}): string {
  const lines = [
    `The final merge of \`${args.featureBranch}\` into \`${args.defaultBranch}\` is blocked by failing CI checks.`,
    args.prNumber ? `PR: ${args.prUrl ?? `#${args.prNumber}`}` : null,
    args.failedChecks.length > 0 ? `Failed checks: ${args.failedChecks.join(", ")}` : null,
    "",
    `Check out \`${args.featureBranch}\`, reproduce and fix the failing checks (these run against the integrated branch, so the failure may only appear when all sprint tasks are combined), then push so the checks re-run.`,
  ];
  if (args.mergedTaskContexts.length > 0) {
    lines.push("", "Tasks merged into this branch:");
    for (const ctx of args.mergedTaskContexts) {
      lines.push(`- ${ctx.taskKey}: ${ctx.taskTitle}`);
    }
  }
  return lines.filter((line) => line !== null).join("\n");
}
