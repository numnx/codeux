import { applyActionRequiredAutomation } from "../../../sprint/action-required-automation.js";
import { runSessionSyncStep } from "../../../sprint/steps/session-sync-step.js";
import { runStatusDerivationStep } from "../../../sprint/steps/status-derivation-step.js";
import { runStartReadyTasksStep } from "../../../sprint/steps/start-ready-tasks-step.js";
import { runStatusTableStep } from "../../../sprint/steps/status-table-step.js";
import { runProtocolStep } from "../../../sprint/steps/protocol-step.js";
import type { SprintCycleResult } from "../../../sprint/sprint-types.js";
import type {
  AutomationInterventionsSettings,
  AutomationLevel,
  CiIntelligenceSettings,
  SprintLoopStepSettings,
  Subtask,
} from "../../../contracts/app-types.js";
import type { SprintOrchestratorDependencies } from "../../../sprint/sprint-orchestrator.js";
import type { SprintExecutionContext } from "../../../services/sprint-execution-state-service.js";
import { FeaturePrGateService } from "../ci/feature-pr-gate.js";

export interface CycleRunnerArgs {
  action: "status" | "orchestrate";
  automationLevel: AutomationLevel;
  automationInterventions: AutomationInterventionsSettings;
  executionContext: SprintExecutionContext;
  repoPath: string;
  defaultFeatureBranch: string;
  retryFailed: boolean;
  loopSteps: SprintLoopStepSettings;
  ciIntelligence: CiIntelligenceSettings;
  githubMode: "REMOTE" | "LOCAL";
  defaultBranch: string;
  featureBranchPrefix: string;
  sprintRunId?: string;
}

export class CycleRunner {
  private readonly ciAutofixRetryCounts = new Map<string, number>();
  private readonly featurePrGate = new FeaturePrGateService();

  constructor(private readonly deps: SprintOrchestratorDependencies) {}

  async run(args: CycleRunnerArgs): Promise<SprintCycleResult & { awaitingMerge: Subtask[] }> {
    let subtasks: Subtask[] = args.loopSteps.loadSubtasks
      ? await this.deps.sprintExecutionStateService.loadSubtasks(
          args.executionContext.project.id,
          args.executionContext.sprint.id,
          args.sprintRunId,
        )
      : [];

    if (args.loopSteps.sessionSync && subtasks.length > 0) {
      const syncResult = await runSessionSyncStep(
        subtasks,
        {
          listSessions: this.deps.listSessions,
          resolveSessionName: this.deps.resolveSessionName,
          extractSessionId: this.deps.extractSessionId,
          fetchRecentActivities: this.deps.fetchRecentActivities,
          isActionRequiredState: this.deps.isActionRequiredState,
          logger: this.deps.logger.child({ component: "session-sync-step" }),
        },
        args.retryFailed,
        {
          repoPath: args.repoPath,
          sprintNumber: args.executionContext.sprintNumber,
        }
      );
      subtasks = syncResult.subtasks;
    }

    if (args.loopSteps.statusDerivation && subtasks.length > 0) {
      subtasks = runStatusDerivationStep(subtasks, {
        retryFailed: args.retryFailed,
        isActionRequiredState: this.deps.isActionRequiredState,
      });
    }

    let reportText = "";
    if (args.loopSteps.startReadyTasks && subtasks.length > 0) {
      const startResult = await runStartReadyTasksStep(subtasks, {
        action: args.action,
        maxFailures: this.deps.settings.maxFailures || 5,
        getConsecutiveFailures: this.deps.getConsecutiveFailures,
        setConsecutiveFailures: this.deps.setConsecutiveFailures,
        startTask: (task) => {
          if (!args.sprintRunId) {
            throw new Error("Missing sprint run id for orchestrate action.");
          }
          return this.deps.startTask(task, {
            projectId: args.executionContext.project.id,
            sprintId: args.executionContext.sprint.id,
            sprintRunId: args.sprintRunId,
            sourceId: args.executionContext.sourceId,
            featureBranch: args.defaultFeatureBranch,
            repoPath: args.repoPath,
            sprintNumber: args.executionContext.sprintNumber,
          });
        },
        resolveSessionName: this.deps.resolveSessionName,
        extractSessionId: this.deps.extractSessionId,
        logger: this.deps.logger.child({ component: "start-ready-tasks-step" }),
      });
      subtasks = startResult.subtasks;
      reportText += startResult.reportText;
    }

    if (subtasks.length > 0) {
      const interventionResult = await applyActionRequiredAutomation(subtasks, {
        automationLevel: args.automationLevel,
        settings: args.automationInterventions,
        isActionRequiredState: this.deps.isActionRequiredState,
        isJulesApiConfigured: this.deps.isJulesApiConfigured,
        approveSessionPlan: this.deps.approveSessionPlan,
        sendSessionMessage: this.deps.sendSessionMessage,
      });
      subtasks = interventionResult.subtasks;
      reportText += interventionResult.reportText;
    }

    if (subtasks.length > 0) {
      const gitStatus = this.deps.getCiStatusForScope
        ? await this.deps.getCiStatusForScope({
            repoPath: args.repoPath,
            scope: "FEATURE_PR_CI",
            featureBranch: args.defaultFeatureBranch,
            defaultBranch: args.defaultBranch,
            featureBranchPrefix: args.featureBranchPrefix,
          })
        : null;

      const ciAutofixResult = await this.featurePrGate.evaluateCiGate(subtasks, {
        automationLevel: args.automationLevel,
        repoPath: args.repoPath,
        featureBranch: args.defaultFeatureBranch,
        defaultBranch: args.defaultBranch,
        featureBranchPrefix: args.featureBranchPrefix,
        ciIntelligence: args.ciIntelligence,
        githubMode: args.githubMode,
        gitStatus,
        ciAutofixRetryCounts: this.ciAutofixRetryCounts,
        isJulesApiConfigured: this.deps.isJulesApiConfigured,
        sendSessionMessage: async (sessionId, message) => {
          await this.deps.sendSessionMessage(sessionId, message);
        },
        autoMergeFeaturePr: this.deps.autoMergeFeaturePr,
        persistMergedTask: async (task) => {
          if (typeof task.record_id !== "string" || task.record_id.trim().length === 0) {
            return;
          }
          this.deps.projectManagementRepository.updateTask(task.record_id, {
            isMerged: Boolean(task.is_merged),
            mergeIndicator: task.merge_indicator || null,
            status: task.status === "COMPLETED" ? "completed" : undefined,
          });
        },
      });
      subtasks = ciAutofixResult.subtasks;
      reportText += ciAutofixResult.reportText;
    }

    const protocolResult = await runProtocolStep(subtasks, {
      featureBranch: args.defaultFeatureBranch,
      githubMode: args.githubMode,
      ciIntelligence: args.ciIntelligence,
      enableMergeProtocol: args.loopSteps.mergeProtocol,
      enableActionRequiredProtocol: args.loopSteps.actionRequiredProtocol,
      isActionRequiredState: this.deps.isActionRequiredState,
      renderInstruction: (templateId, variables) => this.deps.renderInstruction(templateId, variables, args.repoPath),
    });

    const statusTable = args.loopSteps.statusTable ? runStatusTableStep(subtasks) : "";

    return {
      subtasks,
      reportText,
      statusTable,
      instructions: protocolResult.instructions,
      awaitingMerge: protocolResult.awaitingMerge,
    };
  }
}
