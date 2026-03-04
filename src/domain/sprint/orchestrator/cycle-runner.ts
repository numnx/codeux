import type { InstructionTemplateId } from "../../../instructions/instruction-template-catalog.js";
import { applyActionRequiredAutomation } from "../../../sprint/action-required-automation.js";
import { runLoadSubtasksStep } from "../../../sprint/steps/load-subtasks-step.js";
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
import { FeaturePrGateService } from "../ci/feature-pr-gate.js";

export interface CycleRunnerArgs {
  action: "status" | "orchestrate";
  automationLevel: AutomationLevel;
  automationInterventions: AutomationInterventionsSettings;
  sprintNumber: number;
  repoPath: string;
  sourceId?: string;
  defaultFeatureBranch: string;
  subtasksDir: string;
  retryFailed: boolean;
  loopSteps: SprintLoopStepSettings;
  ciIntelligence: CiIntelligenceSettings;
  githubMode: "REMOTE" | "LOCAL";
  defaultBranch: string;
  featureBranchPrefix: string;
}

export class CycleRunner {
  private readonly ciAutofixRetryCounts = new Map<string, number>();
  private readonly featurePrGate = new FeaturePrGateService();

  constructor(private readonly deps: SprintOrchestratorDependencies) {}

  async run(args: CycleRunnerArgs): Promise<SprintCycleResult & { awaitingMerge: Subtask[] }> {
    let subtasks: Subtask[] = [];

    if (args.loopSteps.loadSubtasks) {
      try {
        subtasks = await runLoadSubtasksStep(this.deps.loadSubtasks, args.subtasksDir);
      } catch {
        throw new Error(`Error loading subtasks from ${args.subtasksDir}.`);
      }
    }

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
          sprintNumber: args.sprintNumber,
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
        startTask: (task) =>
          this.deps.startTask(task, args.sourceId, args.defaultFeatureBranch, args.repoPath, args.sprintNumber),
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
      const ciAutofixResult = await this.applyFeatureBranchCiGate(subtasks, {
        automationLevel: args.automationLevel,
        repoPath: args.repoPath,
        subtasksDir: args.subtasksDir,
        featureBranch: args.defaultFeatureBranch,
        defaultBranch: args.defaultBranch,
        featureBranchPrefix: args.featureBranchPrefix,
        ciIntelligence: args.ciIntelligence,
        githubMode: args.githubMode,
      });
      subtasks = ciAutofixResult.subtasks;
      reportText += ciAutofixResult.reportText;
    }

    const protocolResult = await runProtocolStep(subtasks, {
      subtasksDir: args.subtasksDir,
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

  private async applyFeatureBranchCiGate(
    subtasks: Subtask[],
    args: {
      automationLevel: AutomationLevel;
      repoPath: string;
      subtasksDir: string;
      featureBranch: string;
      defaultBranch: string;
      featureBranchPrefix: string;
      ciIntelligence: CiIntelligenceSettings;
      githubMode: "REMOTE" | "LOCAL";
    }
  ): Promise<{ subtasks: Subtask[]; reportText: string }> {
    if (!this.deps.getCiStatusForScope) {
      return { subtasks, reportText: "" };
    }

    const gitStatus = await this.deps.getCiStatusForScope({
      repoPath: args.repoPath,
      scope: "FEATURE_PR_CI",
      featureBranch: args.featureBranch,
      defaultBranch: args.defaultBranch,
      featureBranchPrefix: args.featureBranchPrefix,
    });

    if (!gitStatus) {
      return { subtasks, reportText: "" };
    }

    return this.featurePrGate.evaluateCiGate(subtasks, {
      ...args,
      gitStatus,
      ciAutofixRetryCounts: this.ciAutofixRetryCounts,
      isJulesApiConfigured: () => this.deps.isJulesApiConfigured(),
      sendSessionMessage: (sessionId, message) => this.deps.sendSessionMessage(sessionId, message),
      autoMergeFeaturePr: this.deps.autoMergeFeaturePr,
    });
  }
}
