import { randomUUID } from "crypto";
import { buildTaskRunKey } from "./task-run-key.js";
import { buildProviderPrompt, DEFAULT_CLI_WORKFLOW_SETTINGS } from "./cli-workflow-utils.js";
import type { GitHttpAuthOptions } from "./git-http-auth.js";
import { buildGitHttpAuthEnvForRepoWithFallbacks } from "./git-http-auth.js";
import { runCommandStrict } from "./cli-process-runner.js";
import { resolveProviderForInvocation } from "./provider-routing.js";
import { resolveAgentMemoryInstructions } from "./agent-memory-instructions.js";
import { LEARNINGS_FILENAME } from "../contracts/memory-types.js";
import type { VirtualWorkerServiceDependencies } from "./virtual-worker-service.js";
import type { WorkspaceManager } from "../infrastructure/providers/cli/workspace-manager.js";
import type { WorkspaceArtifactService } from "../infrastructure/providers/cli/workspace-artifact-service.js";
import type { PrService } from "../infrastructure/providers/cli/pr-service.js";
import type { DashboardSettings, ProviderId } from "../contracts/app-types.js";
import type { GuardrailEvaluation, GuardrailScope } from "./guardrail-service.js";
import type { ProjectAttentionItemRecord } from "../contracts/project-attention-types.js";

export interface MergeConflictResolutionServiceDependencies {
  deps: VirtualWorkerServiceDependencies;
  workspaceManager: WorkspaceManager;
  workspaceArtifactService: WorkspaceArtifactService;
  prService: PrService;

  resolveDashboardSettings: (projectId: string, sprintId?: string | null) => DashboardSettings;
  getProviderLabel: (provider: ProviderId) => string;
  escalateAttentionToHuman: (workerEndpointId: string, item: ProjectAttentionItemRecord, summaryMarkdown: string) => void;
  readRequiredString: (value: unknown, label: string) => string;
  readNonNegativeInteger: (value: unknown) => number;
  asRecord: (value: unknown) => Record<string, unknown> | null;
  buildMemoryContext: (projectId: string, sprintId: string | null, agentPresetId: string) => string | undefined;
  captureMemoriesFromWorkspace: (projectId: string, sprintId: string | undefined, agentId: string | null, worktreePath: string, attentionItemId: string) => Promise<number>;
  resolveVirtualWorkerWorkflowSettings: (args: any) => Promise<any>;
  runWorkspaceCommand: (worktreePath: string, command: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;
  runProviderWithRetry: (args: any) => Promise<any>;
}


export class MergeConflictResolutionService {
  constructor(private readonly deps: MergeConflictResolutionServiceDependencies) {}

  public async resolve(workerEndpointId: string, item: ProjectAttentionItemRecord): Promise<void> {
    const settings = this.deps.resolveDashboardSettings(item.projectId, item.sprintId);
    const guardrailScope = { projectId: item.projectId, sprintId: item.sprintId };
    const mergeConflictEval = this.evaluateMergeConflictGuardrail(settings, guardrailScope, item);
    if (mergeConflictEval && !mergeConflictEval.allowed && mergeConflictEval.action !== "WARN_ONLY") {
      this.deps.escalateAttentionToHuman(
        workerEndpointId,
        item,
        `Virtual worker reached the merge-conflict resolution guardrail (${mergeConflictEval.count}/${mergeConflictEval.cap > 0 ? mergeConflictEval.cap : "∞"}). Escalating to human.`,
      );
      return;
    }
    const workerAgent = await this.deps.deps.agentPresetSyncService?.resolveTargetedCodingAgent(
      item.projectId,
      settings.agents?.routing?.mergeConflict?.agentPresetId ?? null,
    ).catch(() => null);
    const route = resolveProviderForInvocation(settings, {
      invocation: "merge_conflict",
      task: {
        id: item.taskId || item.id,
        title: item.title,
        prompt: item.summaryMarkdown,
        depends_on: [],
        is_independent: true,
        status: "PENDING",
      },
      providerPool: ["gemini", "codex", "claude-code", "qwen-code", "opencode", "antigravity"],
      agentProvider: workerAgent
        ? {
          providerConfigId: workerAgent.providerConfigId,
          model: workerAgent.model,
        }
        : null,
    });
    const provider = route.provider as Exclude<ProviderId, "jules">;
    const providerConfigId = route.providerConfigId || route.provider;
    const providerSettings = route.providers[providerConfigId];
    const workflowSettings = {
      ...DEFAULT_CLI_WORKFLOW_SETTINGS,
      ...settings.cliWorkflow,
    };
    const payload = item.payload || {};
    const repoPath = this.deps.readRequiredString(payload.repoPath, "repoPath");
    const conflictingBranches = this.deps.asRecord(payload.conflictingBranches);
    const sourceBranchRaw = conflictingBranches?.source ?? payload.workerBranch;
    if (typeof sourceBranchRaw !== "string" || !sourceBranchRaw.trim()) {
      this.deps.escalateAttentionToHuman(
        workerEndpointId,
        item,
        [
          "Virtual worker cannot resolve merge conflict: source branch is not recorded in the attention payload.",
          "This can happen when the Jules session did not return a workerBranch and gitStatus was unavailable when the conflict was detected.",
          "Please resolve the conflict manually or re-trigger the sprint cycle once the GitHub API is reachable.",
          "",
          item.summaryMarkdown.trim(),
        ].join("\n"),
      );
      return;
    }
    const sourceBranch = sourceBranchRaw.trim();
    const targetBranch = this.deps.readRequiredString(conflictingBranches?.target ?? payload.featureBranch, "targetBranch");
    // LOCAL git mode has no `origin` remote: the seeded merge workspace only carries the
    // target branch as a local ref (`refs/heads/…`), never `refs/remotes/origin/…`. Merging
    // (or verifying) against `origin/<target>` therefore fails with "not something we can
    // merge". Reference the local branch directly in that mode. (Matches the parentRefs
    // selection below.)
    const targetRef = settings.git.githubMode === "LOCAL" ? targetBranch : `origin/${targetBranch}`;
    const gitAuth: GitHttpAuthOptions = {
      githubToken: settings.git.githubToken,
      gitlabToken: settings.git.gitlabToken,
    };

    // A previous cycle may already have pushed the resolution; GitHub lags in recomputing PR
    // mergeability, so the conflict keeps being re-detected. If the target is already merged
    // into the source branch on the remote, skip the (expensive) container run and just clear
    // the attention item — re-dispatching here would only spin up a no-op worker.
    if (settings.git.githubMode !== "LOCAL"
      && await this.isMergeConflictResolvedOnRemote(repoPath, sourceBranch, targetBranch, gitAuth)) {
      // No provider runs here (the remote is already merged), so this must not consume
      // the retry budget — otherwise GitHub mergeability lag could falsely trip the cap.
      this.deps.deps.projectAttentionService.resolveItem(item.id, {
        status: "resolved",
        reason: "virtual_worker_merge_conflict_already_resolved",
        resolutionSummaryMarkdown: [
          item.summaryMarkdown.trim(),
          "",
          `The merge conflict was already resolved on the remote: \`origin/${targetBranch}\` is contained in \`origin/${sourceBranch}\`. Waiting for the upstream PR to refresh its mergeability.`,
        ].join("\n"),
        workerEndpointId,
        payloadPatch: {
          handledBy: "virtual_worker",
          provider,
          sourceBranch,
          targetBranch,
          alreadyResolved: true,
        },
      });
      return;
    }

    // Count every real resolution attempt up-front — before spinning up the provider — so
    // failures, crashes, and quota-exhausted runs all consume the retry budget. Recording
    // only on success (the previous behavior) meant a conflict that never resolved retried
    // indefinitely until the provider API limit was hit instead of escalating after `cap`.
    this.recordMergeConflictAttempt(guardrailScope, item);

    const sessionId = `virtual-merge-${provider}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
    let worktreePath = this.deps.workspaceManager.buildWorktreePath(repoPath, sessionId, workflowSettings.executionMode);
    const title = item.title;
    let succeeded = false;
    let initialHead = "";
    const memoryContext = workerAgent?.id
      ? this.deps.buildMemoryContext(item.projectId, item.sprintId || null, workerAgent.id)
      : undefined;
    const memoryInstructions = settings.memory?.enabled && settings.memory.autoCaptureSprint
      ? resolveAgentMemoryInstructions(workerAgent || {}, settings.memory?.workerLearningsInstruction)
      : "";

    this.deps.deps.sessionTracking.createSession({
      id: sessionId,
      provider,
      taskId: buildTaskRunKey(repoPath, 0, `attention-${item.id}`),
      title,
      prompt: item.summaryMarkdown,
      state: "RUNNING",
      featureBranch: sourceBranch,
      workerBranch: sourceBranch,
      repoPath,
    });
    this.deps.deps.sessionTracking.appendActivity(sessionId, {
      originator: "system",
      description: `Virtual worker claimed merge conflict between ${sourceBranch} and ${targetBranch}.`,
    });

    let cleanedUp = false;
    try {
      const effectiveWorkflowSettings = await this.deps.resolveVirtualWorkerWorkflowSettings({
        workflowSettings,
        sessionId,
        repoPath,
        purpose: "merge_conflict",
      });
      const prepared = await this.deps.workspaceManager.prepareWorktree(
        repoPath,
        this.deps.workspaceManager.buildWorktreePath(repoPath, sessionId, effectiveWorkflowSettings.executionMode),
        sourceBranch,
        sourceBranch,
        undefined,
        gitAuth,
      );
      const finalWorktreePath = prepared.worktreePath;
      worktreePath = finalWorktreePath;
      initialHead = (await this.deps.runWorkspaceCommand(finalWorktreePath, "git", ["rev-parse", "HEAD"])).stdout.trim();
      const hasConflicts = await this.runMergeIntoSource(finalWorktreePath, targetRef, sessionId);
      if (hasConflicts) {
        const workspaceGuidance = await this.deps.workspaceManager.buildWorkspaceGuidance(item.summaryMarkdown, finalWorktreePath);
        const providerPrompt = buildProviderPrompt(
          this.buildMergeConflictPrompt(
            item,
            sourceBranch,
            targetBranch,
            workspaceGuidance,
            workerAgent?.instructionMarkdown,
            memoryContext,
            memoryInstructions,
          ),
          providerSettings.thinkingMode,
        );
        await this.deps.runProviderWithRetry({
          provider,
          providerPrompt,
          workflowSettings: effectiveWorkflowSettings,
          repoPath,
          worktreePath: finalWorktreePath,
          sessionId,
          attentionItem: item,
          purpose: "merge_conflict",
          model: providerSettings.model,
          apiKey: providerSettings.apiKey,
          maxConcurrentTasks: providerSettings.maxConcurrentTasks,
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
          githubToken: settings.git.githubToken,
        });
      }
      await this.ensureMergeConflictResolved(finalWorktreePath);
      await this.finalizeMergeCommit(finalWorktreePath, sourceBranch, targetBranch);
      await this.ensureTargetMergedIntoSource(finalWorktreePath, targetRef);
      if (settings.memory?.enabled && settings.memory.autoCaptureSprint) {
        await this.deps.captureMemoriesFromWorkspace(
          item.projectId,
          item.sprintId || undefined,
          workerAgent?.id || null,
          finalWorktreePath,
          item.id,
        );
      }
      const patchText = await this.deps.workspaceArtifactService.exportBinaryPatch(finalWorktreePath, initialHead);
      const applyResult = await this.deps.workspaceArtifactService.applyPatchToBranch({
        repoPath,
        baseRef: initialHead,
        workerBranch: sourceBranch,
        patchText,
        commitMessage: `fix(merge): resolve ${targetBranch} into ${sourceBranch}`,
        parentRefs: settings.git.githubMode === "LOCAL" ? [targetBranch] : [`origin/${targetBranch}`],
        // A conflict resolved by keeping the source side leaves the tree unchanged but
        // still needs a merge commit recording the target as a parent, otherwise the PR
        // keeps reporting the conflict and the resolution loops forever.
        forceMergeCommit: true,
        gitAuth,
        gitIdentity: effectiveWorkflowSettings.containerMountGitConfig
          ? undefined
          : {
            name: effectiveWorkflowSettings.containerGitUserName,
            email: effectiveWorkflowSettings.containerGitUserEmail,
          },
        githubMode: settings.git.githubMode,
      });
      let hasUnpushed = applyResult.hasChanges;
      let hasAhead = applyResult.hasChanges;
      if (!applyResult.hasChanges) {
        hasUnpushed = await this.deps.prService.hasUnpushedCommits(repoPath, sourceBranch, targetBranch);
        hasAhead = await this.deps.prService.hasWorkerBranchCommitsAgainstFeature(repoPath, sourceBranch, targetBranch);
        if (hasUnpushed && settings.git.githubMode !== "LOCAL") {
          const pushEnv = await buildGitHttpAuthEnvForRepoWithFallbacks(repoPath, gitAuth);
          await runCommandStrict(
            "git",
            ["push", "-u", "origin", `refs/heads/${sourceBranch}:refs/heads/${sourceBranch}`],
            repoPath,
            pushEnv ?? process.env,
          );
        }
      }
      const headSha = applyResult.commitSha
        || ((hasUnpushed || hasAhead)
          ? (await runCommandStrict("git", ["rev-parse", `refs/heads/${sourceBranch}`], repoPath)).stdout.trim()
          : initialHead);
      this.deps.deps.sessionTracking.updateSession(sessionId, { state: "COMPLETED" });
      this.deps.deps.sessionTracking.appendActivity(sessionId, {
        originator: "system",
        description: hasUnpushed || applyResult.hasChanges
          ? `Pushed resolved merge conflict to ${sourceBranch} at ${headSha}.`
          : `Resolved merge-conflict run completed on ${sourceBranch} at ${headSha}.`,
      });
      this.deps.deps.projectAttentionService.resolveItem(item.id, {
        status: "resolved",
        reason: "virtual_worker_merge_conflict_resolved",
        resolutionSummaryMarkdown: [
          item.summaryMarkdown.trim(),
          "",
          `Virtual ${this.deps.getProviderLabel(provider)} worker resolved the merge conflict and pushed the updated source branch.`,
          `Source branch: ${sourceBranch}`,
          `Target branch: ${targetBranch}`,
          `Head SHA: ${headSha}`,
        ].join("\n"),
        workerEndpointId,
        payloadPatch: {
          handledBy: "virtual_worker",
          provider,
          sourceBranch,
          targetBranch,
          headSha,
        },
      });
      succeeded = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.deps.deps.sessionTracking.updateSession(sessionId, { state: "FAILED" });
      this.deps.deps.sessionTracking.appendActivity(sessionId, {
        originator: "system",
        description: `Virtual worker failed to resolve merge conflict: ${message}`,
      });
      this.deps.escalateAttentionToHuman(workerEndpointId, item, [
        `Virtual ${this.deps.getProviderLabel(provider)} worker failed to resolve the merge conflict automatically.`,
        "",
        `Error: ${message}`,
        "",
        item.summaryMarkdown.trim(),
      ].join("\n"));
    } finally {
      // Virtual merge worktrees are ephemeral — always clean up to prevent
      // stale worktree references from poisoning subsequent git fetch operations.
      const shouldCleanup = succeeded
        ? workflowSettings.cleanupWorktreeOnSuccess
        : true;
      if (shouldCleanup) {
        await this.deps.workspaceManager.removeWorktree(repoPath, worktreePath).catch(() => undefined);
        cleanedUp = true;
      }
      if (!cleanedUp) {
        this.deps.deps.sessionTracking.appendActivity(sessionId, {
          originator: "system",
          description: `Preserved merge-resolution worktree at ${worktreePath}.`,
        });
      }
    }
  }

  private evaluateMergeConflictGuardrail(
    settings: DashboardSettings,
    scope: GuardrailScope,
    item: ProjectAttentionItemRecord,
  ): GuardrailEvaluation | null {
    if (item.taskId) {
      return this.deps.deps.guardrailService?.evaluate(scope, item.taskId, "merge_conflict") ?? null;
    }

    const jobConfig = settings.guardrails?.jobs?.merge_conflict;
    if (!settings.guardrails?.enabled || !jobConfig) {
      return { allowed: true, count: 0, cap: 0, action: jobConfig?.onLimit ?? "WARN_ONLY" };
    }

    const count = this.deps.readNonNegativeInteger(item.payload?.mergeConflictResolutionAttempts);
    const cap = jobConfig.cap;
    if (cap <= 0) {
      return { allowed: true, count, cap, action: jobConfig.onLimit };
    }

    return {
      allowed: count < cap,
      count,
      cap,
      action: jobConfig.onLimit,
      reason: count < cap ? undefined : `Reached max merge_conflict invocations for this sprint-level attention item (${count}/${cap}).`,
    };
  }

  private recordMergeConflictAttempt(scope: GuardrailScope, item: ProjectAttentionItemRecord): void {
    if (item.taskId) {
      this.deps.deps.guardrailService?.record(scope, item.taskId, "merge_conflict");
      return;
    }

    const nextCount = this.deps.readNonNegativeInteger(item.payload?.mergeConflictResolutionAttempts) + 1;
    const updated = this.deps.deps.projectAttentionService.patchItemPayload(item.id, {
      mergeConflictResolutionAttempts: nextCount,
      mergeConflictGuardrailSubject: `attention:${item.id}`,
    });
    item.payload = updated.payload;
  }

  private async runMergeIntoSource(worktreePath: string, targetRef: string, sessionId: string): Promise<boolean> {
    try {
      await this.deps.runWorkspaceCommand(worktreePath, "git", ["merge", "--no-ff", "--no-commit", targetRef]);
      return false;
    } catch (error) {
      const isConflict = error instanceof Error && error.message.includes("Automatic merge failed");
      if (!isConflict) {
        throw error;
      }
      this.deps.deps.sessionTracking.appendActivity(sessionId, {
        originator: "system",
        description: `Verified merge conflict against ${targetRef}. Preparing resolution workspace.`,
      });
      return true;
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
    await this.deps.runWorkspaceCommand(worktreePath, "git", ["add", "-A"]);
    const stillConflicted = await this.listFilesWithConflictMarkers(worktreePath, unresolved);
    if (stillConflicted.length > 0) {
      throw new Error(`Unresolved merge conflicts remain: ${stillConflicted.join(", ")}`);
    }
  }

  private async listUnresolvedFiles(worktreePath: string): Promise<string[]> {
    const result = await this.deps.runWorkspaceCommand(worktreePath, "git", ["diff", "--name-only", "--diff-filter=U"]);
    return result.stdout.split("\n").map((entry) => entry.trim()).filter(Boolean);
  }

  private async listFilesWithConflictMarkers(worktreePath: string, files: string[]): Promise<string[]> {
    if (files.length === 0) {
      return [];
    }
    try {
      const result = await this.deps.runWorkspaceCommand(worktreePath, "git", [
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
      return [];
    }
  }

  private async finalizeMergeCommit(worktreePath: string, sourceBranch: string, targetBranch: string): Promise<void> {
    const mergeHead = await this.hasMergeHead(worktreePath);
    const status = (await this.deps.runWorkspaceCommand(worktreePath, "git", ["status", "--porcelain"])).stdout.trim();
    if (!mergeHead && status.length === 0) {
      return;
    }

    await this.deps.runWorkspaceCommand(worktreePath, "git", ["add", "-A"]);
    try {
      await this.deps.runWorkspaceCommand(
        worktreePath,
        "git",
        ["commit", "-m", `Resolve merge conflict: ${targetBranch} into ${sourceBranch}`],
      );
    } catch (error) {
      const nextStatus = (await this.deps.runWorkspaceCommand(worktreePath, "git", ["status", "--porcelain"])).stdout.trim();
      if (nextStatus.length > 0 || await this.hasMergeHead(worktreePath)) {
        throw error;
      }
    }
  }

  private async ensureTargetMergedIntoSource(worktreePath: string, targetRef: string): Promise<void> {
    try {
      await this.deps.runWorkspaceCommand(worktreePath, "git", ["merge-base", "--is-ancestor", targetRef, "HEAD"]);
    } catch {
      throw new Error(`Merge verification failed: ${targetRef} is not contained in the resolved source branch.`);
    }
  }

  private async hasMergeHead(worktreePath: string): Promise<boolean> {
    try {
      await this.deps.runWorkspaceCommand(worktreePath, "git", ["rev-parse", "-q", "--verify", "MERGE_HEAD"]);
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
      workspaceGuidance.trim(),
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  private extractCurrentTaskPrompt(payload: Record<string, unknown>): string {
    if (typeof payload.currentTaskPrompt === "string" && payload.currentTaskPrompt.trim()) {
      return payload.currentTaskPrompt.trim();
    }

    const currentTask = this.deps.asRecord(payload.currentTask);
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
      .map((entry) => this.deps.asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry))
      .map((entry) => {
        const taskKey = typeof entry.taskKey === "string" ? entry.taskKey : "task";
        const title = typeof entry.taskTitle === "string"
          ? entry.taskTitle
          : typeof entry.title === "string"
            ? entry.title
            : "Unknown context";
        const prompt = typeof entry.taskPrompt === "string"
          ? entry.taskPrompt
          : typeof entry.prompt === "string"
            ? entry.prompt
            : "";
        return `${taskKey} ${title}\n\n${prompt}`.trim();
      })
      .filter(Boolean);
  }
}
