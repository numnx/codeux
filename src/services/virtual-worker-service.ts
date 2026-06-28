import { CiFixResolutionService } from "./ci-fix-resolution-service.js";
import { MergeConflictResolutionService } from "./merge-conflict-resolution-service.js";
import { randomUUID } from "crypto";
import type { CliWorkflowSettings, DashboardSettings, GitCiRunStatus, JulesSession, ProviderId, QwenModelProviderSettings, WorkerExecutionMode, Subtask } from "../contracts/app-types.js";
import type { WorkerTaskDispatchClaim } from "../contracts/execution-types.js";
import type { ProjectAttentionItemRecord } from "../contracts/project-attention-types.js";
import type { SettingsRepository } from "../repositories/settings-repository.js";
import type { SessionTrackingRepository } from "../repositories/session-tracking-repository.js";
import type { ExecutionRepository } from "../repositories/execution-repository.js";
import type { ProjectManagementRepository } from "../repositories/project-management-repository.js";
import type { WorkerEndpointRepository } from "../repositories/worker-endpoint-repository.js";
import type { ProjectWorkerAssignmentRepository } from "../repositories/project-worker-assignment-repository.js";
import type { Logger } from "../shared/logging/logger.js";
import { buildTaskRunKey } from "./task-run-key.js";
import { buildProviderPrompt, DEFAULT_CLI_WORKFLOW_SETTINGS, sanitizeToken } from "./cli-workflow-utils.js";
import { isReadFileNotFoundToolError, buildReadFileRetryPrompt } from "./cli-workflow-text-utils.js";
import { WorkspaceManager } from "../infrastructure/providers/cli/workspace-manager.js";
import { WorkspaceArtifactService } from "../infrastructure/providers/cli/workspace-artifact-service.js";
import { ProviderRunner } from "../infrastructure/providers/cli/provider-runner.js";
import { DockerRunner } from "../infrastructure/providers/cli/docker-runner.js";
import { PrService } from "../infrastructure/providers/cli/pr-service.js";
import { ProviderExecutionService, resolveEffectiveModel } from "./provider-execution-service.js";
import type { GuardrailEvaluation, GuardrailScope, GuardrailService } from "./guardrail-service.js";
import { runCommandStrict } from "./cli-process-runner.js";
import { buildGitHttpAuthEnvForRepoWithFallbacks, type GitHttpAuthOptions } from "./git-http-auth.js";
import { ProjectAttentionService } from "../domain/workers/project-attention-service.js";
import { ProjectWorkerAssignmentService } from "../domain/workers/project-worker-assignment-service.js";
import { WorkerTaskDispatchService } from "./worker-task-dispatch-service.js";
import { CliWorkflowService } from "./cli-workflow-service.js";
import { resolveProviderForInvocation, resolveWorkerModelForProvider } from "./provider-routing.js";
import { ProviderConcurrencyService } from "./provider-concurrency-service.js";
import { resolveEffectiveDashboardSettings } from "./settings-resolution-service.js";
import type { WorkerInboxReplyService } from "./worker-inbox-reply-service.js";
import type { InstructionService } from "../instructions/instruction-template-service.js";
import type { SprintExecutionStateService } from "./sprint-execution-state-service.js";
import type { MemoryService } from "./memory-service.js";
import type { AgentPresetSyncService } from "./agent-preset-sync-service.js";
import { resolveAgentMemoryInstructions } from "./agent-memory-instructions.js";
import { LEARNINGS_FILENAME } from "../contracts/memory-types.js";
import { DockerService } from "./docker-service.js";
import {
  isOrchestratorHandledClarificationItem,
  projectNeedsVirtualWorker,
  peekNextWorkerAttention,
  resolveWorkerExecutionMode,
} from "../domain/workers/virtual-worker-scheduling-policy.js";
import { planVirtualWorkerCycle } from "../domain/workers/virtual-worker-cycle-plan.js";

const VIRTUAL_WORKER_RECONCILE_MS = 3_000;
const VIRTUAL_WORKER_SESSION_POLL_MS = 2_000;

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}



function isTerminalSessionState(state: string | undefined): boolean {
  return state === "COMPLETED" || state === "FAILED" || state === "CANCELLED" || state === "QUOTA" || state === "RATE_LIMITED";
}

function extractPullRequest(session: JulesSession): { url?: string; workerBranch?: string } | null {
  const output = (session.outputs || [])
    .map((entry) => entry.pullRequest)
    .find((entry): entry is { url?: string; workerBranch?: string } => Boolean(entry));
  return output || null;
}

function resolveTerminalDispatchState(session: JulesSession): "COMPLETED" | "FAILED" | "QUOTA" | null {
  if (session.state === "QUOTA") {
    return "QUOTA";
  }
  if (session.state === "RATE_LIMITED") {
    return "QUOTA";
  }
  if (session.state === "FAILED" || session.state === "CANCELLED") {
    return "FAILED";
  }
  if (extractPullRequest(session) || session.state === "COMPLETED") {
    return "COMPLETED";
  }
  return null;
}

export interface VirtualWorkerServiceDependencies {
  settingsRepository: SettingsRepository;
  sessionTracking: SessionTrackingRepository;
  executionRepository: ExecutionRepository;
  projectManagementRepository: ProjectManagementRepository;
  workerEndpointRepository: WorkerEndpointRepository;
  projectWorkerAssignmentRepository: ProjectWorkerAssignmentRepository;
  projectWorkerAssignmentService: ProjectWorkerAssignmentService;
  projectAttentionService: ProjectAttentionService;
  guardrailService?: GuardrailService;
  workerTaskDispatchService: WorkerTaskDispatchService;
  cliWorkflowService: CliWorkflowService;
  sprintExecutionStateService: SprintExecutionStateService;
  workerInboxReplyService: WorkerInboxReplyService;
  instructionService: InstructionService;
  approveSessionPlan: (sessionId: string) => Promise<unknown>;
  sendSessionMessage: (sessionId: string, prompt: string) => Promise<unknown>;
  providerConcurrencyService: ProviderConcurrencyService;
  memoryService?: MemoryService;
  agentPresetSyncService?: Pick<AgentPresetSyncService, "getOptionalWorkerAgentForRepoPath" | "resolveTargetedCodingAgent">;
  logger?: Logger;
}

export class VirtualWorkerService {
  private readonly workspaceManager = new WorkspaceManager();
  private readonly workspaceArtifactService = new WorkspaceArtifactService(this.workspaceManager);
  public readonly mergeConflictResolutionService: MergeConflictResolutionService;
  public readonly ciFixResolutionService: CiFixResolutionService;

  private readonly dockerService = new DockerService();
  private readonly prService = new PrService();

  private readonly providerRunner = new ProviderRunner(new DockerRunner());

  private readonly activeCycles = new Map<string, Promise<void>>();

  private readonly scheduledProjects = new Set<string>();

  private reconcileTimer: ReturnType<typeof setInterval> | null = null;

  private readonly providerExecutionService: ProviderExecutionService;

  constructor(private readonly deps: VirtualWorkerServiceDependencies) {

    this.ciFixResolutionService = new CiFixResolutionService({
      deps: this.deps,
      workspaceManager: this.workspaceManager,
      workspaceArtifactService: this.workspaceArtifactService,
      prService: this.prService,
      resolveDashboardSettings: this.resolveDashboardSettings.bind(this),
      getProviderLabel: this.getProviderLabel.bind(this),
      escalateAttentionToHuman: this.escalateAttentionToHuman.bind(this),
      readRequiredString: this.readRequiredString.bind(this),
      readNonNegativeInteger: this.readNonNegativeInteger.bind(this),
      asRecord: this.asRecord.bind(this),
      buildMemoryContext: this.buildMemoryContext.bind(this),
      captureMemoriesFromWorkspace: this.captureMemoriesFromWorkspace.bind(this),
      resolveVirtualWorkerWorkflowSettings: (...args: any[]) => (this.resolveVirtualWorkerWorkflowSettings as any)(...args),
      runWorkspaceCommand: (...args: any[]) => (this.runWorkspaceCommand as any)(...args),
      runProviderWithRetry: (...args: any[]) => (this.runProviderWithRetry as any)(...args)
    });

    this.mergeConflictResolutionService = new MergeConflictResolutionService({
      deps: this.deps,
      workspaceManager: this.workspaceManager,
      workspaceArtifactService: this.workspaceArtifactService,
      prService: this.prService,
      resolveDashboardSettings: this.resolveDashboardSettings.bind(this),
      getProviderLabel: this.getProviderLabel.bind(this),
      escalateAttentionToHuman: this.escalateAttentionToHuman.bind(this),
      readRequiredString: this.readRequiredString.bind(this),
      readNonNegativeInteger: this.readNonNegativeInteger.bind(this),
      asRecord: this.asRecord.bind(this),
      buildMemoryContext: this.buildMemoryContext.bind(this),
      captureMemoriesFromWorkspace: this.captureMemoriesFromWorkspace.bind(this),
      resolveVirtualWorkerWorkflowSettings: (...args: any[]) => (this.resolveVirtualWorkerWorkflowSettings as any)(...args),
      runWorkspaceCommand: (...args: any[]) => (this.runWorkspaceCommand as any)(...args),
      runProviderWithRetry: (...args: any[]) => (this.runProviderWithRetry as any)(...args)
    });
    this.providerExecutionService = new ProviderExecutionService({
      executionRepository: deps.executionRepository,
      providerRunner: this.providerRunner,
      providerConcurrencyService: deps.providerConcurrencyService,
      logger: deps.logger,
      sessionTracking: deps.sessionTracking,
    });
  }

  start(): void {
    if (this.reconcileTimer) {
      return;
    }

    this.cleanupOrphanedVirtualWorkers();
    void this.reconcile();
    this.reconcileTimer = setInterval(() => {
      void this.reconcile().catch((error) => {
        this.deps.logger?.error("Virtual worker reconcile failed", { error });
      });
    }, VIRTUAL_WORKER_RECONCILE_MS);
    this.reconcileTimer.unref?.();
  }

  stop(): void {
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
      this.reconcileTimer = null;
    }
  }

  scheduleProject(projectId: string, reason: string, resolver?: (pId: string, sId?: string | null) => DashboardSettings): void {
    if (this.activeCycles.has(projectId) || this.scheduledProjects.has(projectId)) {
      return;
    }
    if (!this.projectNeedsVirtualWorker(projectId, resolver)) {
      return;
    }

    this.scheduledProjects.add(projectId);
    queueMicrotask(() => {
      this.scheduledProjects.delete(projectId);
      if (this.activeCycles.has(projectId) || !this.projectNeedsVirtualWorker(projectId, resolver)) {
        return;
      }

      const cycle = this.runProjectCycle(projectId, reason, resolver)
        .catch((error) => {
          this.deps.logger?.error("Virtual worker cycle failed", { projectId, reason, error });
        })
        .finally(() => {
          this.activeCycles.delete(projectId);
          if (this.projectNeedsVirtualWorker(projectId, resolver)) {
            this.scheduleProject(projectId, "remaining_worker_work", resolver);
          }
        });

      this.activeCycles.set(projectId, cycle);
    });
  }

  async reconcile(): Promise<void> {
    const cycleCache = new Map<string, DashboardSettings>();
    const resolver = (pId: string, sId?: string | null): DashboardSettings => {
      const key = `${pId}:${sId ?? ""}`;
      if (cycleCache.has(key)) {
        return cycleCache.get(key)!;
      }
      const settings = this.resolveDashboardSettings(pId, sId);
      cycleCache.set(key, settings);
      return settings;
    };

    for (const project of this.deps.projectManagementRepository.listProjects().projects) {
      if (this.projectNeedsVirtualWorker(project.id, resolver)) {
        this.scheduleProject(project.id, "reconcile", resolver);
      }
    }
  }

  private projectUsesVirtualWorkers(projectId: string, sprintId?: string | null): boolean {
    return resolveWorkerExecutionMode(this.resolveDashboardSettings(projectId, sprintId)) === "VIRTUAL";
  }

  private resolveDashboardSettings(projectId: string, sprintId?: string | null): DashboardSettings {
    return resolveEffectiveDashboardSettings(this.deps.settingsRepository, projectId, sprintId).settings;
  }

  private projectNeedsVirtualWorker(projectId: string, resolver?: (pId: string, sId?: string | null) => DashboardSettings): boolean {
    return projectNeedsVirtualWorker(
      this.activeCycles.has(projectId),
      this.peekNextWorkerAttention(projectId, resolver)
    );
  }

  private async runProjectCycle(projectId: string, reason: string, resolver?: (pId: string, sId?: string | null) => DashboardSettings): Promise<void> {
    const effectiveResolver = resolver || ((pId, sId) => this.resolveDashboardSettings(pId, sId));

    // Create the virtual endpoint first so that downstream operations (like task dispatch) have a valid target ID.
    // If the planner determines no work is needed, the endpoint is safely cleaned up in the finally block.
    const initialCycleSettings = this.resolveCycleSettings(projectId, resolver);
    const initialCycleProviderType = initialCycleSettings.aiProvider.providers[initialCycleSettings.workers.virtualWorkerProvider]?.provider || "codex";

    const endpoint = this.deps.workerEndpointRepository.createVirtualEndpoint({
      endpointKey: `virtual:${projectId}:${Date.now().toString(36)}:${sanitizeToken(randomUUID().slice(0, 8))}`,
      displayName: `Virtual ${this.getProviderLabel(initialCycleProviderType)} Worker`,
      status: "connected",
      transport: "internal",
      capabilities: {
        canSuperviseProjects: true,
        canExecuteTasks: true,
      },
    });

    this.deps.projectWorkerAssignmentService.ensureWorkerAssignment(projectId, endpoint.id);

    try {
      const attentionItem = this.peekNextWorkerAttention(projectId, resolver);
      const dispatchClaim = this.deps.workerTaskDispatchService.claimNextDispatchForWorker({
        projectId,
        workerEndpointId: endpoint.id,
        executionMode: "VIRTUAL"
      });

      const plan = await planVirtualWorkerCycle({
        projectId,
        attentionItem,
        dispatchClaim,
        isProviderConcurrencyAvailable: async (pId, limit) => await this.deps.providerConcurrencyService.hasAvailableCapacity(pId, limit),
        resolveSettings: effectiveResolver
      });

      if (plan.type === "HANDLE_ATTENTION") {
        // We peeked earlier, so we need to properly claim it now exactly as pickNextWorkerAttention did
        const nextItem = plan.attentionItem;
        if (nextItem.status === "open") {
          this.deps.projectAttentionService.resolveItem(nextItem.id, { status: "claimed" } as any);
          nextItem.status = "claimed";
        }
        await this.handleAttentionItem(endpoint.id, nextItem, reason);
      } else if (plan.type === "DISPATCH_READY") {
        await this.handleTaskDispatch(endpoint.id, plan.dispatchClaim);
      }
    } finally {
      this.deps.projectWorkerAssignmentService.releaseWorkerAssignment(projectId, endpoint.id, "virtual_worker_cycle_complete");
      this.deps.workerEndpointRepository.deleteWorkerEndpoint(endpoint.id);
    }
  }

  private peekNextWorkerAttention(projectId: string, resolver?: (pId: string, sId?: string | null) => DashboardSettings): ProjectAttentionItemRecord | null {
    const items = this.deps.projectAttentionService.listActiveProjectItems(projectId);
    const effectiveResolver = resolver || ((pId, sId) => this.resolveDashboardSettings(pId, sId));
    return peekNextWorkerAttention(items, effectiveResolver);
  }



  private async handleTaskDispatch(workerEndpointId: string, claim: WorkerTaskDispatchClaim): Promise<void> {
    const settings = this.resolveDashboardSettings(claim.project.id, claim.sprint.id);
    const providerConfigId = settings.workers.virtualWorkerProvider;
    const providerSettings = settings.aiProvider.providers[providerConfigId];
    const provider = providerSettings.provider as Exclude<ProviderId, "jules">;
    const taskRun = this.deps.executionRepository.getTaskRunByDispatchId(claim.dispatch.id);
    if (!taskRun) {
      throw new Error(`Task run not found for dispatch ${claim.dispatch.id}`);
    }

    const task = this.deps.projectManagementRepository.getTask(claim.dispatch.taskId);

    const session = await this.deps.cliWorkflowService.startTask({
      provider,
      providerSettingsOverride: {
        model: resolveWorkerModelForProvider(
          provider,
          task?.model || settings.workers.model,
          providerSettings.model,
        ),
        thinkingMode: providerSettings.thinkingMode,
        apiKey: providerSettings.apiKey,
      qwenAuthMode: providerSettings.qwenAuthMode,
      qwenRegion: providerSettings.qwenRegion,
      qwenBaseUrl: providerSettings.qwenBaseUrl,
      qwenEnvKey: providerSettings.qwenEnvKey,
      qwenModelId: providerSettings.qwenModelId,
      qwenProtocol: providerSettings.qwenProtocol,
      qwenAdditionalModelProviders: providerSettings.qwenAdditionalModelProviders,
        openCodeAuthMode: providerSettings.openCodeAuthMode,
        openCodeProviderId: providerSettings.openCodeProviderId,
        openCodeModelId: providerSettings.openCodeModelId,
        openCodeBaseUrl: providerSettings.openCodeBaseUrl,
        openCodeEnvKey: providerSettings.openCodeEnvKey,
        openCodePackage: providerSettings.openCodePackage,
        providerMountAuth: providerSettings.mountAuth,
        providerAuthPath: providerSettings.authPath,
        customBaseUrl: providerSettings.customBaseUrl,
        customModel: providerSettings.customModel,
      },
      task: {
        record_id: claim.task.id,
        project_id: claim.project.id,
        sprint_id: claim.sprint.id,
        id: claim.task.taskKey,
        title: claim.task.title,
        prompt: claim.task.promptMarkdown,
        depends_on: [...claim.task.dependsOnTaskIds],
        is_independent: true,
        status: "PENDING",
      },
      repoPath: claim.executionContext.repoPath,
      featureBranch: claim.executionContext.featureBranch,
      sprintNumber: claim.sprint.number ?? 0,
      dispatchId: claim.dispatch.id,
      taskRunId: taskRun.id,
    });
    const pullRequest = extractPullRequest(session);

    this.deps.workerEndpointRepository.touchWorkerEndpointHeartbeat(workerEndpointId, "connected");
    this.deps.workerTaskDispatchService.updateDispatchForWorker({
      workerEndpointId,
      dispatchId: claim.dispatch.id,
      leaseToken: claim.leaseToken,
      state: "RUNNING",
      provider,
      sessionId: session.id,
      sessionName: session.name,
      workerBranch: pullRequest?.workerBranch || claim.executionContext.featureBranch,
      prUrl: pullRequest?.url,
    });

    while (true) {
      await sleep(VIRTUAL_WORKER_SESSION_POLL_MS);
      this.deps.workerEndpointRepository.touchWorkerEndpointHeartbeat(workerEndpointId, "connected");

      const currentSession = this.deps.sessionTracking.getSession(session.id) || session;
      const persistedTaskRun = this.deps.executionRepository.getTaskRunByDispatchId(claim.dispatch.id);
      const terminalState = persistedTaskRun?.state === "COMPLETED"
        ? "COMPLETED"
        : persistedTaskRun?.state === "FAILED"
          ? "FAILED"
          : persistedTaskRun?.state === "QUOTA"
            ? "QUOTA"
            : persistedTaskRun?.state === "BLOCKED"
              ? "BLOCKED"
              : resolveTerminalDispatchState(currentSession);
      const currentPullRequest = extractPullRequest(currentSession);
      const update = this.deps.workerTaskDispatchService.updateDispatchForWorker({
        workerEndpointId,
        dispatchId: claim.dispatch.id,
        leaseToken: claim.leaseToken,
        state: terminalState || "RUNNING",
        provider,
        sessionId: currentSession.id,
        sessionName: currentSession.name,
        workerBranch: currentPullRequest?.workerBranch || claim.executionContext.featureBranch,
        prUrl: currentPullRequest?.url,
        summaryMarkdown: terminalState ? this.buildDispatchSummary(claim, currentSession) : undefined,
        errorMessage: terminalState === "FAILED"
          ? `Virtual worker session ended in state ${currentSession.state || "FAILED"}`
          : undefined,
      });

      if (terminalState || update.controlAction === "cancel" || isTerminalSessionState(currentSession.state)) {
        return;
      }
    }
  }

  private buildDispatchSummary(claim: WorkerTaskDispatchClaim, session: JulesSession): string {
    const pullRequest = extractPullRequest(session);
    return [
      `Project: ${claim.project.name}`,
      `Sprint: ${claim.sprint.name}`,
      `Task: ${claim.task.taskKey} ${claim.task.title}`,
      `Worker mode: virtual`,
      `Provider: ${session.provider || "unknown"}`,
      `State: ${session.state || "UNKNOWN"}`,
      pullRequest?.workerBranch ? `Worker branch: ${pullRequest.workerBranch}` : null,
      pullRequest?.url ? `Pull request: ${pullRequest.url}` : null,
    ].filter(Boolean).join("\n");
  }

  private resolveCycleSettings(projectId: string, resolver?: (pId: string, sId?: string | null) => DashboardSettings): DashboardSettings {
    const effectiveResolver = resolver || ((pId, sId) => this.resolveDashboardSettings(pId, sId));
    const attentionItem = this.deps.projectAttentionService.listActiveProjectItems(projectId)
      .find((item) => item.ownerType === "worker");
    if (attentionItem) {
      return effectiveResolver(projectId, attentionItem.sprintId);
    }

    return effectiveResolver(projectId);
  }

  private async handleAttentionItem(workerEndpointId: string, item: ProjectAttentionItemRecord, reason: string): Promise<void> {
    // Check if it's an orchestrator-managed clarification recovery item we somehow claimed anyway.
    if (isOrchestratorHandledClarificationItem(item.summaryMarkdown)) {
      // Just release it, don't escalate. The orchestrator will handle it.
      return;
    }

    const claimed = item.status === "claimed"
      ? this.deps.projectAttentionService.claimItem(item.id, workerEndpointId, `virtual_worker_reclaimed:${reason}`)
      : this.deps.projectAttentionService.claimItem(item.id, workerEndpointId, `virtual_worker_claimed:${reason}`);
    this.deps.workerEndpointRepository.touchWorkerEndpointHeartbeat(workerEndpointId, "connected");

    if (claimed.attentionType === "merge_conflict" || claimed.attentionType === "merge_required") {
      await this.resolveMergeConflictAttention(workerEndpointId, claimed);
      return;
    }

    if (claimed.attentionType === "ci_fix_required") {
      await this.resolveCiFixAttention(workerEndpointId, claimed);
      return;
    }

    if (claimed.attentionType === "action_required") {
      await this.resolveActionRequiredAttention(workerEndpointId, claimed);
      return;
    }

    this.escalateAttentionToHuman(workerEndpointId, claimed, [
      "Virtual worker cannot handle this worker-owned attention item automatically.",
      "",
      claimed.summaryMarkdown.trim(),
    ].join("\n"));
  }

  private async resolveActionRequiredAttention(workerEndpointId: string, item: ProjectAttentionItemRecord): Promise<void> {
    const settings = this.resolveDashboardSettings(item.projectId, item.sprintId);
    const payload = item.payload || {};
    const sessionState = typeof payload.sessionState === "string" ? payload.sessionState : null;
    // Prefer the session id captured on the attention payload, but fall back to
    // the task's latest run so that an item missing the field (older items, or
    // any code path that forgot to populate it) can still be handled instead of
    // being needlessly escalated to a human and pausing the sprint.
    let sessionId = typeof payload.sessionId === "string" && payload.sessionId.trim().length > 0
      ? payload.sessionId.trim()
      : null;
    if (!sessionId && item.taskId) {
      const latestRun = this.deps.executionRepository.getLatestTaskRun(item.taskId);
      sessionId = latestRun?.sessionId?.trim()
        || latestRun?.sessionName?.replace(/^sessions\//, "").trim()
        || null;
    }

    if (!sessionId) {
      this.escalateAttentionToHuman(workerEndpointId, item, "No session ID available for action-required attention.");
      return;
    }

    try {
      if (sessionState === "AWAITING_PLAN_APPROVAL" && settings.automationInterventions.autoApprovePlan) {
        await this.deps.approveSessionPlan(sessionId);
        this.deps.projectAttentionService.resolveItem(item.id, {
          status: "resolved",
          reason: "virtual_worker_auto_approved_plan",
          resolutionSummaryMarkdown: "Virtual worker automatically approved the session plan.",
          workerEndpointId,
        });
        return;
      }

      if (sessionState === "AWAITING_USER_FEEDBACK" && settings.automationInterventions.autoAnswerClarification) {
        const guardrailScope = { projectId: item.projectId, sprintId: item.sprintId };
        const clarificationEval = item.taskId
          ? this.deps.guardrailService?.evaluate(guardrailScope, item.taskId, "clarification_reply") ?? null
          : null;
        if (clarificationEval && !clarificationEval.allowed && clarificationEval.action !== "WARN_ONLY") {
          this.escalateAttentionToHuman(
            workerEndpointId,
            item,
            `Virtual worker reached the clarification auto-answer guardrail (${clarificationEval.count}/${clarificationEval.cap}). Escalating to human.`,
          );
          return;
        }

        const task = this.deps.projectManagementRepository.getTask(item.taskId || "");
        const sprint = this.deps.projectManagementRepository.getSprint(item.sprintId || "");
        if (!task || !sprint) {
          throw new Error("Missing task or sprint context for clarification reply.");
        }

        const subtasks = await this.deps.sprintExecutionStateService.loadSubtasks(item.projectId, item.sprintId || "");

        const reply = await this.deps.workerInboxReplyService.generateClarificationReply({
          projectId: item.projectId,
          sprintGoal: sprint.goal || "",
          subtasks,
          task: task as unknown as Subtask,
        });

        await this.deps.sendSessionMessage(sessionId, reply);
        if (item.taskId) {
          this.deps.guardrailService?.record(guardrailScope, item.taskId, "clarification_reply");
        }

        this.deps.projectAttentionService.resolveItem(item.id, {
          status: "resolved",
          reason: "virtual_worker_auto_answered_clarification",
          resolutionSummaryMarkdown: [
            "Virtual worker automatically answered clarification request.",
            "",
            "Reply:",
            reply,
          ].join("\n"),
          workerEndpointId,
        });
        return;
      }

      this.escalateAttentionToHuman(workerEndpointId, item, `Virtual worker cannot handle action-required state: ${sessionState || "unknown"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.escalateAttentionToHuman(workerEndpointId, item, `Virtual worker failed to handle action-required attention: ${message}`);
    }
  }

  private async resolveMergeConflictAttention(workerEndpointId: string, item: ProjectAttentionItemRecord): Promise<void> {
    return this.mergeConflictResolutionService.resolve(workerEndpointId, item);
  }

  private async resolveCiFixAttention(workerEndpointId: string, item: ProjectAttentionItemRecord): Promise<void> {
    return this.ciFixResolutionService.resolve(workerEndpointId, item);
  }


  private async resolveVirtualWorkerWorkflowSettings(args: {
    workflowSettings: CliWorkflowSettings;
    sessionId: string;
    repoPath: string;
    purpose: "ci_fix" | "merge_conflict";
  }): Promise<CliWorkflowSettings> {
    if (args.workflowSettings.executionMode !== "DOCKER") {
      return args.workflowSettings;
    }

    const dockerAvailable = await this.dockerService.isAvailable();
    if (dockerAvailable) {
      return args.workflowSettings;
    }

    if (args.purpose === "merge_conflict") {
      throw new Error(
        "Docker is unavailable, and merge-conflict resolution requires isolated container execution. Fix Docker availability and retry.",
      );
    }

    this.deps.sessionTracking.appendActivity(args.sessionId, {
      originator: "system",
      description: "Docker is unavailable. Falling back to HOST execution mode for virtual worker CI autofix.",
    });
    return {
      ...args.workflowSettings,
      executionMode: "HOST",
    };
  }

  private async runMergeIntoSource(worktreePath: string, targetRef: string, sessionId: string): Promise<boolean> {
    try {
      await this.runWorkspaceCommand(worktreePath, "git", ["merge", "--no-ff", "--no-commit", targetRef]);
      this.deps.sessionTracking.appendActivity(sessionId, {
        originator: "system",
        description: `Prepared merge of ${targetRef} into the source branch without conflicts.`,
      });
      return false;
    } catch (error) {
      const unresolved = await this.listUnresolvedFiles(worktreePath);
      if (unresolved.length === 0) {
        throw error;
      }
      this.deps.sessionTracking.appendActivity(sessionId, {
        originator: "system",
        description: `Merge produced conflicts in: ${unresolved.join(", ")}`,
      });
      return true;
    }
  }

  private async runProviderWithRetry(args: {
    provider: Exclude<ProviderId, "jules">;
    providerPrompt: string;
    workflowSettings: DashboardSettings["cliWorkflow"];
    repoPath: string;
    worktreePath: string;
    sessionId: string;
    attentionItem: ProjectAttentionItemRecord;
    purpose: "ci_fix" | "merge_conflict";
    model: string;
    apiKey: string;
    maxConcurrentTasks?: number;
    qwenAuthMode?: "LOCAL_AUTH" | "ALIBABA_CODING_PLAN" | "MODEL_PROVIDER";
    qwenRegion?: "china" | "international";
    qwenBaseUrl?: string;
    qwenEnvKey?: string;
    qwenModelId?: string;
    qwenProtocol?: "openai" | "anthropic" | "gemini";
    qwenAdditionalModelProviders?: QwenModelProviderSettings[];
  openCodeAuthMode?: "LOCAL_AUTH" | "ENV_KEY" | "CUSTOM_PROVIDER";
  openCodeProviderId?: string;
  openCodeModelId?: string;
  openCodeBaseUrl?: string;
  openCodeEnvKey?: string;
  openCodePackage?: string;
    providerMountAuth?: boolean;
    providerAuthPath?: string;
    customBaseUrl?: string;
    customModel?: string;
    githubToken: string;
  }): Promise<void> {
    const effectiveModel = resolveEffectiveModel({
      provider: args.provider,
      model: args.model,
      customModel: args.customModel,
      qwenAuthMode: args.qwenAuthMode,
      qwenModelId: args.qwenModelId,
      openCodeAuthMode: args.openCodeAuthMode,
      openCodeProviderId: args.openCodeProviderId,
      openCodeModelId: args.openCodeModelId,
    });

    const result = await this.providerExecutionService.executeProvider({
      projectId: args.attentionItem.projectId,
      sprintId: args.attentionItem.sprintId,
      taskId: args.attentionItem.taskId,
      sprintRunId: args.attentionItem.sprintRunId,
      dispatchId: args.attentionItem.dispatchId,
      attentionItemId: args.attentionItem.id,
      purpose: args.purpose,
      type: args.purpose,
      provider: args.provider,
      prompt: args.providerPrompt,
      cwd: args.worktreePath,
      model: effectiveModel,
      apiKey: args.apiKey,
      maxConcurrentTasks: args.maxConcurrentTasks,
      qwenAuthMode: args.qwenAuthMode,
      qwenRegion: args.qwenRegion,
      qwenBaseUrl: args.qwenBaseUrl,
      qwenEnvKey: args.qwenEnvKey,
      qwenModelId: args.qwenModelId,
      qwenProtocol: args.qwenProtocol,
      qwenAdditionalModelProviders: args.qwenAdditionalModelProviders,
        openCodeAuthMode: args.openCodeAuthMode,
        openCodeProviderId: args.openCodeProviderId,
        openCodeModelId: args.openCodeModelId,
        openCodeBaseUrl: args.openCodeBaseUrl,
        openCodeEnvKey: args.openCodeEnvKey,
        openCodePackage: args.openCodePackage,
      providerMountAuth: args.providerMountAuth,
      providerAuthPath: args.providerAuthPath,
      customBaseUrl: args.customBaseUrl,
      customModel: args.customModel,
      sessionId: args.sessionId,
      workflowSettings: args.workflowSettings,
      repoPath: args.repoPath,
      githubToken: args.githubToken,
    });

    if (!result.ok) {
      throw new Error(result.stderr || result.stdout || "Provider failed without output.");
    }
  }

  private async isMergeConflictResolvedOnRemote(
    repoPath: string,
    sourceBranch: string,
    targetBranch: string,
    gitAuth: GitHttpAuthOptions,
  ): Promise<boolean> {
    try {
      const env = await buildGitHttpAuthEnvForRepoWithFallbacks(repoPath, gitAuth);
      await runCommandStrict("git", ["fetch", "origin", sourceBranch, targetBranch], repoPath, env ?? process.env);
      await runCommandStrict(
        "git",
        ["merge-base", "--is-ancestor", `origin/${targetBranch}`, `origin/${sourceBranch}`],
        repoPath,
      );
      return true;
    } catch {
      return false;
    }
  }

  private async ensureMergeConflictResolved(worktreePath: string): Promise<void> {
    const unresolved = await this.listUnresolvedFiles(worktreePath);
    if (unresolved.length === 0) {
      return;
    }
    // The agent almost always edits the working-tree files to resolve the conflict but
    // leaves them unstaged, so the index still records unmerged stage entries and
    // `git diff --diff-filter=U` keeps listing them. That is NOT an unresolved conflict —
    // only files that still contain conflict markers are. (Every provider — Qwen, Codex,
    // Antigravity — hits this: they remove the markers, run tests, then hand back without
    // staging, expecting the orchestrator to finalize the index.) Stage the agent's edits
    // first so resolved unmerged entries collapse, then verify no markers survived.
    await this.runWorkspaceCommand(worktreePath, "git", ["add", "-A"]);
    const stillConflicted = await this.listFilesWithConflictMarkers(worktreePath, unresolved);
    if (stillConflicted.length > 0) {
      throw new Error(`Unresolved merge conflicts remain: ${stillConflicted.join(", ")}`);
    }
  }

  private async listUnresolvedFiles(worktreePath: string): Promise<string[]> {
    const result = await this.runWorkspaceCommand(worktreePath, "git", ["diff", "--name-only", "--diff-filter=U"]);
    return result.stdout.split("\n").map((entry) => entry.trim()).filter(Boolean);
  }

  private async listFilesWithConflictMarkers(worktreePath: string, files: string[]): Promise<string[]> {
    if (files.length === 0) {
      return [];
    }
    try {
      // Search the staged content for surviving conflict markers. Requiring the start
      // (`<<<<<<<`) or end (`>>>>>>>`) markers — rather than the `=======` separator,
      // which appears legitimately in markdown/RST — avoids false positives.
      const result = await this.runWorkspaceCommand(worktreePath, "git", [
        "grep",
        "--cached",
        "-l",
        "-E",
        "^(<{7}|>{7})( |$)",
        "--",
        ...files,
      ]);
      return result.stdout.split("\n").map((entry) => entry.trim()).filter(Boolean);
    } catch {
      // `git grep` exits non-zero when it finds no matches, which is exactly the
      // success case here: the agent removed every conflict marker.
      return [];
    }
  }

  private async finalizeMergeCommit(worktreePath: string, sourceBranch: string, targetBranch: string): Promise<void> {
    const mergeHead = await this.hasMergeHead(worktreePath);
    const status = (await this.runWorkspaceCommand(worktreePath, "git", ["status", "--porcelain"])).stdout.trim();
    if (!mergeHead && status.length === 0) {
      return;
    }

    await this.runWorkspaceCommand(worktreePath, "git", ["add", "-A"]);
    try {
      await this.runWorkspaceCommand(
        worktreePath,
        "git",
        ["commit", "-m", `Resolve merge conflict: ${targetBranch} into ${sourceBranch}`],
      );
    } catch (error) {
      const nextStatus = (await this.runWorkspaceCommand(worktreePath, "git", ["status", "--porcelain"])).stdout.trim();
      if (nextStatus.length > 0 || await this.hasMergeHead(worktreePath)) {
        throw error;
      }
    }
  }

  private async ensureTargetMergedIntoSource(worktreePath: string, targetRef: string): Promise<void> {
    try {
      await this.runWorkspaceCommand(worktreePath, "git", ["merge-base", "--is-ancestor", targetRef, "HEAD"]);
    } catch {
      throw new Error(`Merge verification failed: ${targetRef} is not contained in the resolved source branch.`);
    }
  }

  private async hasMergeHead(worktreePath: string): Promise<boolean> {
    try {
      await this.runWorkspaceCommand(worktreePath, "git", ["rev-parse", "-q", "--verify", "MERGE_HEAD"]);
      return true;
    } catch {
      return false;
    }
  }

  private buildMergeConflictPrompt(
    item: ProjectAttentionItemRecord,
    sourceBranch: string,
    targetBranch: string,
    workspaceGuidance: string,
    workerInstruction?: string,
    memoryContext?: string,
    memoryInstructions?: string,
  ): string {
    const payload = item.payload || {};
    const mergedTaskPrompts = this.extractMergeConflictTaskPrompts(
      Array.isArray(payload.mergedTaskPrompts)
        ? payload.mergedTaskPrompts
        : Array.isArray(payload.featureBranchTaskContexts)
          ? payload.featureBranchTaskContexts
          : [],
    );
    const currentTaskPrompt = this.extractCurrentTaskPrompt(payload);

    return [
      "Resolve the active Git merge conflict already present in this worktree.",
      workerInstruction?.trim() ? `## Agent Instructions\n\n${workerInstruction.trim()}` : null,
      `Source branch: ${sourceBranch}`,
      `Target branch: ${targetBranch}`,
      "",
      memoryContext?.trim() || null,
      "",
      "Requirements:",
      "- Preserve the intended work from both branches.",
      "- Resolve only the conflict and any directly related fallout.",
      "- Leave the branch in a clean, committed, pushable state.",
      "- Do not open a new pull request or rewrite history.",
      "",
      currentTaskPrompt ? "Current task prompt:" : null,
      currentTaskPrompt || null,
      mergedTaskPrompts.length > 0 ? "\nMerged task prompts already present on the target branch:" : null,
      mergedTaskPrompts.length > 0 ? mergedTaskPrompts.join("\n\n") : null,
      "",
      "## LEARNINGS CAPTURE (Required)",
      memoryInstructions?.trim()
        || `Before you finish, write key durable learnings and pitfalls from this merge-conflict resolution to \`${LEARNINGS_FILENAME}\`.`,
      "",
      "Original attention summary:",
      item.summaryMarkdown.trim(),
      "",
      workspaceGuidance,
    ].filter(Boolean).join("\n");
  }

  private extractCurrentTaskPrompt(payload: Record<string, unknown>): string {
    if (typeof payload.currentTaskPrompt === "string" && payload.currentTaskPrompt.trim()) {
      return payload.currentTaskPrompt.trim();
    }

    const currentTask = this.asRecord(payload.currentTask);
    if (typeof currentTask?.taskPrompt === "string" && currentTask.taskPrompt.trim()) {
      return currentTask.taskPrompt.trim();
    }

    if (typeof payload.taskPrompt === "string" && payload.taskPrompt.trim()) {
      return payload.taskPrompt.trim();
    }

    return "";
  }

  private extractMergeConflictTaskPrompts(entries: unknown[]): string[] {
    return entries
      .map((entry) => this.asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry))
      .map((entry) => {
        const taskKey = typeof entry.taskKey === "string" ? entry.taskKey : "task";
        const title = typeof entry.taskTitle === "string"
          ? entry.taskTitle
          : typeof entry.title === "string"
            ? entry.title
            : taskKey;
        const prompt = typeof entry.taskPrompt === "string"
          ? entry.taskPrompt
          : typeof entry.prompt === "string"
            ? entry.prompt
            : "";
        return `${taskKey} ${title}\n\n${prompt}`.trim();
      })
      .filter(Boolean);
  }

  private escalateAttentionToHuman(workerEndpointId: string, item: ProjectAttentionItemRecord, summaryMarkdown: string): void {
    this.deps.projectAttentionService.openItem({
      projectId: item.projectId,
      sprintId: item.sprintId,
      taskId: item.taskId,
      sprintRunId: item.sprintRunId,
      dispatchId: item.dispatchId,
      attentionType: "human_escalation_required",
      severity: item.severity,
      ownerType: "human",
      title: `Virtual worker escalation: ${item.title}`,
      summaryMarkdown,
      payload: {
        ...(item.payload || {}),
        sourceAttentionItemId: item.id,
        sourceAttentionType: item.attentionType,
        escalatedBy: "virtual_worker",
      },
    });
    this.deps.projectAttentionService.resolveItem(item.id, {
      status: "resolved",
      reason: "virtual_worker_escalated",
      resolutionSummaryMarkdown: summaryMarkdown,
      workerEndpointId,
      payloadPatch: {
        workerOutcome: "needs_human_escalation",
      },
    });
  }

  private cleanupOrphanedVirtualWorkers(): void {
    const orphaned = this.deps.workerEndpointRepository.listWorkerEndpoints()
      .filter((endpoint) => endpoint.endpointType === "virtual_cli");

    for (const endpoint of orphaned) {
      for (const assignment of this.deps.projectWorkerAssignmentRepository.listActiveAssignmentsForWorker(endpoint.id)) {
        this.deps.projectWorkerAssignmentService.releaseWorkerAssignment(assignment.projectId, endpoint.id, "virtual_worker_startup_prune");
      }
      this.deps.workerEndpointRepository.deleteWorkerEndpoint(endpoint.id);
    }
  }

  private getProviderLabel(provider: ProviderId): string {
    switch (provider) {
      case "claude-code":
        return "Claude Code";
      case "qwen-code":
        return "Qwen Code";
      case "opencode":
        return "OpenCode";
      case "gemini":
        return "Gemini";
      case "codex":
      default:
        return "Codex";
    }
  }

  private readRequiredString(value: unknown, label: string): string {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) {
      throw new Error(`Missing ${label} in virtual worker attention payload.`);
    }
    return normalized;
  }

  private readNonNegativeInteger(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value));
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    }
    return 0;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private buildMemoryContext(projectId: string, sprintId: string | null, agentPresetId: string): string | undefined {
    const memoryService = this.deps.memoryService;
    if (!memoryService) {
      return undefined;
    }

    try {
      const longTerm = memoryService.listLongTermByAgent(projectId, agentPresetId, 10);
      const shortTerm = sprintId
        ? memoryService.listBySprintAndAgent(projectId, sprintId, agentPresetId, 10)
        : [];

      if (longTerm.length === 0 && shortTerm.length === 0) {
        return undefined;
      }

      const sections: string[] = ["## PROJECT CONTEXT FROM MEMORY"];
      if (longTerm.length > 0) {
        sections.push("### Long-Term Knowledge");
        for (const memory of longTerm) {
          sections.push(`- [${memory.category}] ${memory.content.slice(0, 300)}`);
        }
      }
      if (shortTerm.length > 0) {
        sections.push("### Recent Sprint Learnings");
        for (const memory of shortTerm) {
          sections.push(`- [${memory.category}] ${memory.content.slice(0, 300)}`);
        }
      }
      return sections.join("\n");
    } catch {
      return undefined;
    }
  }

  private async captureMemoriesFromWorkspace(
    projectId: string,
    sprintId: string | undefined,
    agentPresetId: string | null,
    worktreePath: string,
    originId: string,
  ): Promise<number> {
    if (!this.deps.memoryService) {
      return 0;
    }
    if (worktreePath.startsWith("docker-volume://")) {
      const raw = await this.workspaceManager.readWorkspaceFile(worktreePath, LEARNINGS_FILENAME);
      if (!raw) {
        return 0;
      }
      return await this.deps.memoryService.captureMemoriesFromContent(
        projectId,
        sprintId,
        agentPresetId,
        raw,
        originId,
      );
    }
    return await this.deps.memoryService.captureMemoriesFromWorktree(
      projectId,
      sprintId,
      agentPresetId,
      worktreePath,
      originId,
    );
  }

  private async runWorkspaceCommand(worktreePath: string, command: string, args: string[]) {
    if (worktreePath.startsWith("docker-volume://")) {
      return this.workspaceManager.runWorkspaceCommand(worktreePath, command, args);
    }
    return runCommandStrict(command, args, worktreePath);
  }
}
