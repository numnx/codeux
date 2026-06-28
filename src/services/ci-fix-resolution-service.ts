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
import type { DashboardSettings, ProviderId, GitCiRunStatus } from "../contracts/app-types.js";
import type { ProjectAttentionItemRecord } from "../contracts/project-attention-types.js";

export interface CiFixResolutionServiceDependencies {
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

function formatCiFixFailureDetails(failedRuns: GitCiRunStatus[], fallbackLogSnippets: string[]): string {
  if (failedRuns.length === 0) {
    return fallbackLogSnippets.length > 0
      ? `No structured failed run metadata was available. Failed job logs:\n${fallbackLogSnippets.join("\n\n")}`
      : "No structured failed run metadata or failed-job logs were available in the CI status payload.";
  }

  const sections: string[] = [];
  failedRuns.forEach((run, runIndex) => {
    const runLabel = run.workflowName || run.name || `run-${run.id ?? runIndex + 1}`;
    const lines = [
      `### Failed Run ${runIndex + 1}: ${runLabel}`,
      `- Run ID: ${run.id ?? "unknown"}`,
      `- Run URL: ${run.url || "unknown"}`,
      `- Status: ${run.status}`,
      `- Conclusion: ${run.conclusion ?? "unknown"}`,
      `- Event: ${run.event ?? "unknown"}`,
      `- Head branch: ${run.headBranch ?? "unknown"}`,
      `- Updated at: ${run.updatedAt ?? "unknown"}`,
    ];

    const jobs = Array.isArray(run.failedJobs) ? run.failedJobs : [];
    if (jobs.length === 0) {
      lines.push("- Failed jobs: unavailable from CI metadata.");
    } else {
      lines.push("- Failed jobs:");
      jobs.forEach((job, jobIndex) => {
        lines.push(`  ${jobIndex + 1}. ${job.name}`);
        lines.push(`     - Job ID: ${job.id ?? "unknown"}`);
        lines.push(`     - Conclusion: ${job.conclusion ?? "unknown"}`);
        lines.push(`     - Failed steps: ${job.failedSteps.length > 0 ? job.failedSteps.join(", ") : "not reported"}`);
        lines.push(`     - Log command: ${job.logCommand ?? "not available"}`);
        lines.push("     - Failed log excerpt:");
        lines.push("```text");
        lines.push(job.logExcerpt?.trim() || "No failed-job log excerpt was available.");
        lines.push("```");
      });
    }

    sections.push(lines.join("\n"));
  });

  return sections.join("\n\n");
}

export class CiFixResolutionService {
  constructor(public readonly deps: CiFixResolutionServiceDependencies) {}

  public async resolve(workerEndpointId: string, item: ProjectAttentionItemRecord): Promise<void> {
    const settings = this.deps.resolveDashboardSettings(item.projectId, item.sprintId);
    const workerAgent = await this.deps.deps.agentPresetSyncService?.resolveTargetedCodingAgent(
      item.projectId,
      settings.agents?.routing?.ciFix?.agentPresetId ?? null,
    ).catch(() => null);
    const route = resolveProviderForInvocation(settings, {
      invocation: "ci_fix",
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
    const branchName = this.deps.readRequiredString(
      payload.workerBranch ?? payload.branchName,
      "branchName",
    );
    const compareBaseBranch = typeof payload.featureBranch === "string" && payload.featureBranch.trim().length > 0
      ? payload.featureBranch.trim()
      : (settings.git.defaultBranch || "main");

    const guardrailScope = { projectId: item.projectId, sprintId: item.sprintId };
    // Task-level CI fixes key the guardrail by task id. Sprint-level fixes (e.g. the
    // final feature→default merge gate) have no task, so key by a stable synthetic id
    // derived from the attention item — otherwise an unfixable failure would retry
    // forever and the sprint would wait indefinitely instead of escalating.
    const guardrailKey = item.taskId
      || `main-merge-ci-fix:${item.sprintRunId ?? item.id}`;
    const ciFixEval = this.deps.deps.guardrailService?.evaluate(guardrailScope, guardrailKey, "ci_fix") ?? null;
    const retryCount = ciFixEval?.count ?? 0;
    const maxRetries = ciFixEval?.cap ?? 0;
    const capLabel = maxRetries > 0 ? String(maxRetries) : "∞";

    if (ciFixEval && !ciFixEval.allowed && ciFixEval.action !== "WARN_ONLY") {
      this.deps.escalateAttentionToHuman(workerEndpointId, item, `Virtual worker reached the CI autofix guardrail (${retryCount}/${capLabel}). Escalating to human.`);
      return;
    }

    // Record the attempt up-front so failed/crashed CI-fix runs also consume the retry
    // budget — recording only on success let an unfixable failure retry until the
    // provider API limit instead of escalating after `cap` attempts.
    this.deps.deps.guardrailService?.record(guardrailScope, guardrailKey, "ci_fix");

    const sessionId = `virtual-cifix-${provider}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
    const resumeTarget = this.deps.deps.sessionTracking.findLatestCliSessionForBranch({
      repoPath,
      workerBranch: branchName,
      providers: [provider],
    });
    const workspaceOwnerSessionId = resumeTarget?.sessionId || sessionId;
    let worktreePath = this.deps.workspaceManager.buildWorkspaceRef(repoPath, workspaceOwnerSessionId, workflowSettings.executionMode);
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
      featureBranch: branchName,
      workerBranch: branchName,
      repoPath,
    });
    this.deps.deps.sessionTracking.appendActivity(sessionId, {
      originator: "system",
      description: `Virtual worker claimed CI fix for branch ${branchName} (Attempt ${retryCount + 1}/${maxRetries}).`,
    });

    let cleanedUp = false;
    const gitAuth: GitHttpAuthOptions = {
      githubToken: settings.git.githubToken,
      gitlabToken: settings.git.gitlabToken,
    };
    try {
      const effectiveWorkflowSettings = await this.deps.resolveVirtualWorkerWorkflowSettings({
        workflowSettings,
        sessionId,
        repoPath,
        purpose: "ci_fix",
      });
      const prepared = await this.deps.workspaceManager.prepareWorktree(
        repoPath,
        this.deps.workspaceManager.buildWorkspaceRef(repoPath, workspaceOwnerSessionId, effectiveWorkflowSettings.executionMode),
        branchName,
        branchName,
        resumeTarget?.sessionId,
        gitAuth,
      );
      const finalWorktreePath = prepared.worktreePath;
      worktreePath = finalWorktreePath;
      initialHead = (await this.deps.runWorkspaceCommand(finalWorktreePath, "git", ["rev-parse", "HEAD"])).stdout.trim();

      const workspaceGuidance = await this.deps.workspaceManager.buildWorkspaceGuidance(item.summaryMarkdown, finalWorktreePath);
      const providerPrompt = buildProviderPrompt(
        this.buildCiFixPrompt(
          item,
          branchName,
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
        purpose: "ci_fix",
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
        workerBranch: branchName,
        patchText,
        commitMessage: `fix(ci): resolve failing checks on ${branchName}`,
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
        hasUnpushed = await this.deps.prService.hasUnpushedCommits(repoPath, branchName, compareBaseBranch);
        hasAhead = await this.deps.prService.hasWorkerBranchCommitsAgainstFeature(repoPath, branchName, compareBaseBranch);
        if (hasUnpushed && settings.git.githubMode !== "LOCAL") {
          const pushEnv = await buildGitHttpAuthEnvForRepoWithFallbacks(repoPath, gitAuth);
          await runCommandStrict(
            "git",
            ["push", "-u", "origin", `refs/heads/${branchName}:refs/heads/${branchName}`],
            repoPath,
            pushEnv ?? process.env,
          );
        }
      }
      if (!applyResult.hasChanges && !hasUnpushed) {
        throw new Error(
          "CI fix completed without producing a patch or unpublished branch commits; refusing to mark the fix as pushed.",
        );
      }
      const headSha = applyResult.commitSha
        || ((hasUnpushed || hasAhead)
          ? (await runCommandStrict("git", ["rev-parse", `refs/heads/${branchName}`], repoPath)).stdout.trim()
          : initialHead);
      this.deps.deps.sessionTracking.updateSession(sessionId, { state: "COMPLETED" });
      this.deps.deps.sessionTracking.appendActivity(sessionId, {
        originator: "system",
        description: hasUnpushed || applyResult.hasChanges
          ? `Pushed CI fix to ${branchName} at ${headSha}.`
          : `CI fix run completed on ${branchName} at ${headSha}.`,
      });

      this.deps.deps.projectAttentionService.resolveItem(item.id, {
        status: "resolved",
        reason: "virtual_worker_ci_fix_resolved",
        resolutionSummaryMarkdown: [
          item.summaryMarkdown.trim(),
          "",
          `Virtual ${this.deps.getProviderLabel(provider)} worker fixed CI issues and pushed the updated branch.`,
          `Branch: ${branchName}`,
          `Head SHA: ${headSha}`,
          `Attempt: ${retryCount + 1}/${capLabel}`,
        ].join("\n"),
        workerEndpointId,
        payloadPatch: {
          handledBy: "virtual_worker",
          provider,
          branchName,
          headSha,
          attempt: retryCount + 1,
        },
      });
      succeeded = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.deps.deps.sessionTracking.updateSession(sessionId, { state: "FAILED" });
      this.deps.deps.sessionTracking.appendActivity(sessionId, {
        originator: "system",
        description: `Virtual worker failed to fix CI issues: ${message}`,
      });
      this.deps.escalateAttentionToHuman(workerEndpointId, item, [
        `Virtual ${this.deps.getProviderLabel(provider)} worker failed to fix CI issues automatically.`,
        "",
        `Error: ${message}`,
        "",
        item.summaryMarkdown.trim(),
      ].join("\n"));
    } finally {
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
          description: `Preserved CI-fix worktree at ${worktreePath}.`,
        });
      }
    }
  }

  public buildCiFixPrompt(
    item: ProjectAttentionItemRecord,
    branchName: string,
    workspaceGuidance: string,
    workerInstruction?: string,
    memoryContext?: string,
    memoryInstructions?: string,
  ): string {
    const payload = item.payload || {};
    const failedChecks = Array.isArray(payload.failedChecks) ? payload.failedChecks as string[] : [];
    const failedRuns = Array.isArray(payload.failedRuns) ? payload.failedRuns as GitCiRunStatus[] : [];
    const failedJobLabels = Array.isArray(payload.failedJobLabels) ? payload.failedJobLabels as string[] : [];
    const failedLogSnippets = Array.isArray(payload.failedLogSnippets) ? payload.failedLogSnippets as string[] : [];
    const prUrl = typeof payload.prUrl === "string" ? payload.prUrl : "";
    const prNumber = typeof payload.prNumber === "number" ? payload.prNumber : 0;
    const taskKey = typeof payload.taskKey === "string" ? payload.taskKey : item.taskId || "unknown task";
    const taskTitle = typeof payload.taskTitle === "string" ? payload.taskTitle : item.title;
    const taskPrompt = typeof payload.taskPrompt === "string" ? payload.taskPrompt.trim() : "";
    const featureBranch = typeof payload.featureBranch === "string" ? payload.featureBranch : "";
    const defaultBranch = typeof payload.defaultBranch === "string" ? payload.defaultBranch : "";
    const failureDetails = formatCiFixFailureDetails(failedRuns, failedLogSnippets);

    return [
      "# CI Fix Job",
      "",
      "You are not starting or reimplementing the original task. The original task work already exists on this branch and has an open PR. Your job is to repair the failing CI checks with the smallest necessary changes, commit those fixes, and leave the same branch pushable.",
      "",
      "## CI Failure Target",
      `- PR: ${prNumber > 0 ? `#${prNumber}` : "unknown"}${prUrl ? ` (${prUrl})` : ""}`,
      `- Worker branch to fix: \`${branchName}\``,
      featureBranch ? `- PR base / sprint feature branch: \`${featureBranch}\`` : null,
      defaultBranch ? `- Repository default branch: \`${defaultBranch}\`` : null,
      `- Original task: ${taskKey}${taskTitle ? ` - ${taskTitle}` : ""}`,
      `- Failed checks: ${failedChecks.length > 0 ? failedChecks.join(", ") : "unknown"}`,
      `- Failed jobs: ${failedJobLabels.length > 0 ? failedJobLabels.join(", ") : "unknown"}`,
      "",
      "## Required Outcome",
      "- Investigate the CI failures using the details below as the primary source of truth.",
      "- Fix only the root cause of the failing CI checks.",
      "- Commit the necessary changes on the current worker branch.",
      "- Do not open a new pull request, do not rewrite history, and do not restart the original task from scratch.",
      "- If the provided CI metadata is insufficient, then use the included `gh run view ... --log-failed` commands to fetch missing logs.",
      "",
      "## Failed CI Details",
      failureDetails,
      "",
      workerInstruction?.trim() ? `## General Coding Agent Instructions\n\n${workerInstruction.trim()}` : null,
      prUrl ? `PR URL: ${prUrl}` : null,
      "",
      memoryContext?.trim() || null,
      "",
      taskPrompt ? "## Original Task Context (Reference Only)\nThe implementation below is already present on the worker branch. Use it only to understand the intended behavior while fixing CI; do not redo the whole task.\n\n" + taskPrompt : null,
      "",
      "## LEARNINGS CAPTURE (Required)",
      memoryInstructions?.trim()
        || `Before you finish, write key durable learnings and pitfalls from this CI fix to \`${LEARNINGS_FILENAME}\`.`,
      "",
      "## Original Attention Summary",
      item.summaryMarkdown.trim(),
      "",
      workspaceGuidance,
    ].filter(Boolean).join("\n");
  }
}
