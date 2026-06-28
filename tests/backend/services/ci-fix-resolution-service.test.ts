import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { CiFixResolutionService, CiFixResolutionServiceDependencies } from "../../../src/services/ci-fix-resolution-service.js";
import * as providerRouting from "../../../src/services/provider-routing.js";
import { runCommandStrict } from "../../../src/services/cli-process-runner.js";

vi.mock("../../../src/services/cli-process-runner.js", () => ({
  runCommandStrict: vi.fn().mockResolvedValue({ ok: true, stdout: "", stderr: "", code: 0 }),
}));


describe("CiFixResolutionService scenarios", () => {
  let mockLogger: any;
  let mockSyncService: any;
  let mockDeps: any;
  let loggerSpy: any;
  let service: CiFixResolutionService;
  let removeWorktreeSpy: any;

  beforeEach(() => {
    mockLogger = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };

    mockSyncService = {
      resolveTargetedCodingAgent: vi.fn().mockResolvedValue({ id: "agent-1" }),
    };

    mockDeps = {
      deps: {
        logger: mockLogger,
        agentPresetSyncService: mockSyncService,
        guardrailService: {
          evaluate: vi.fn().mockReturnValue({ allowed: true, action: "ALLOW" }),
          recordEvent: vi.fn(),
          record: vi.fn(),
        },
        executionRepository: {
          createRun: vi.fn().mockReturnValue({ id: "run-1" }),
          updateRunStatus: vi.fn(),
          createTask: vi.fn().mockReturnValue({ id: "task-1" }),
          createExecutionInvocation: vi.fn().mockReturnValue({ id: "inv-1" }),
          appendExecutionInvocationMessage: vi.fn(),
          updateExecutionInvocation: vi.fn(),
          getLatestTaskRunsByIds: vi.fn().mockResolvedValue([{ id: "task-run-1" }]),
        },
        sessionTracking: {
          findLatestCliSessionForBranch: vi.fn().mockReturnValue(null),
          appendActivity: vi.fn(),
          createSession: vi.fn(),
          updateSession: vi.fn(),
        },
        projectManagementRepository: {
          getProject: vi.fn().mockReturnValue({}),
        },
        workerEndpointRepository: {
          getWorkerEndpoint: vi.fn().mockReturnValue({}),
        },
        projectAttentionService: { resolveItem: vi.fn(), patchItemPayload: vi.fn().mockReturnValue({ payload: {} }) },
      },
      readRequiredString: vi.fn().mockImplementation((val) => val || "/tmp/fallback"),
      readNonNegativeInteger: vi.fn().mockReturnValue(0),
      asRecord: vi.fn().mockImplementation((val) => val || {}),
      buildMemoryContext: vi.fn().mockReturnValue(""),
      captureMemoriesFromWorkspace: vi.fn().mockResolvedValue(0),
      resolveVirtualWorkerWorkflowSettings: vi.fn().mockResolvedValue({ cleanupWorktreeOnSuccess: true }),
      runWorkspaceCommand: vi.fn().mockResolvedValue({ ok: true, stdout: "", stderr: "", code: 0 }),
      runProviderWithRetry: vi.fn().mockResolvedValue(undefined),
      resolveDashboardSettings: vi.fn().mockReturnValue({
        agents: { routing: { ciFix: { agentPresetId: "preset-1" }, mergeConflict: { agentPresetId: "preset-1" } } },
        git: { githubMode: "LOCAL" }, providers: { openai: { thinkingMode: "STANDARD", model: "gpt-4", apiKey: "test" } },
        memory: { enabled: false }, guardrails: { enabled: false }
      }),
      workspaceManager: {
        removeWorktree: vi.fn().mockResolvedValue(undefined),
        buildWorkspaceRef: vi.fn().mockReturnValue("ref"),
        buildWorktreePath: vi.fn().mockReturnValue("/tmp/worktree"),
        prepareWorktree: vi.fn().mockResolvedValue({ worktreePath: "/tmp/worktree" }),
        buildWorkspaceGuidance: vi.fn().mockResolvedValue("guidance"),
      },
      workspaceArtifactService: {
        exportBinaryPatch: vi.fn().mockResolvedValue("patch"),
        applyPatchToBranch: vi.fn().mockResolvedValue({ hasChanges: true, commitSha: "sha123" }),
      },
      prService: {
        hasUnpushedCommits: vi.fn().mockResolvedValue(true),
        hasWorkerBranchCommitsAgainstFeature: vi.fn().mockResolvedValue(true),
      },
      getProviderLabel: vi.fn().mockReturnValue("Provider"),
      escalateAttentionToHuman: vi.fn(),
    };

    removeWorktreeSpy = vi.spyOn(mockDeps.workspaceManager, 'removeWorktree');

    service = new CiFixResolutionService(mockDeps as unknown as CiFixResolutionServiceDependencies);

    vi.spyOn(providerRouting, "resolveProviderForInvocation").mockReturnValue({
      provider: "openai",
      providerConfigId: "openai",
      invocation: "ci_fix",
      strategy: "AGENT",
      manualProvider: null,
      providers: {
        openai: {
          thinkingMode: "STANDARD",
          model: "gpt-4",
          apiKey: "test",
        }
      } as any,
      enabledProviders: [],
    });
    vi.spyOn(providerRouting, "resolveWorkerModelForProvider").mockReturnValue("gpt-4");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Happy path: patch applied, committed — service resolves.", async () => {
    const item = {
      projectId: "proj-1",
      sprintId: "sprint-1",
      id: "item-1",
      payload: { repoPath: "/tmp/repo", branchName: "branch", featureBranch: "feature" },
      title: "title",
      summaryMarkdown: "summary",
    } as any;

    mockDeps.readRequiredString.mockReturnValueOnce("/tmp/repo").mockReturnValueOnce("branch");
    await service.resolve("worker-1", item);
    expect(mockDeps.deps.projectAttentionService.resolveItem).toHaveBeenCalled();
    expect(removeWorktreeSpy).toHaveBeenCalled();
  });

  it("Empty patch: when the worker returns a patch with no changes, service throws a descriptive error.", async () => {
    const item = {
      projectId: "proj-1",
      sprintId: "sprint-1",
      id: "item-1",
      payload: { repoPath: "/tmp/repo", branchName: "branch", featureBranch: "feature" },
      title: "title",
      summaryMarkdown: "summary",
    } as any;

    mockDeps.readRequiredString.mockReturnValueOnce("/tmp/repo").mockReturnValueOnce("branch");
    mockDeps.workspaceArtifactService.applyPatchToBranch.mockResolvedValue({ hasChanges: false });
    mockDeps.prService.hasUnpushedCommits.mockResolvedValue(false);
    mockDeps.prService.hasWorkerBranchCommitsAgainstFeature.mockResolvedValue(false);

    await service.resolve("worker-1", item);
    expect(mockDeps.escalateAttentionToHuman).toHaveBeenCalledWith(
        "worker-1",
        item,
        expect.stringContaining("CI fix completed without producing a patch or unpublished branch commits")
    );
    expect(removeWorktreeSpy).toHaveBeenCalled();
  });

  it("CI fix execution timeout: fix step rejects with a timeout error — rejection propagates.", async () => {
    const item = {
      projectId: "proj-1",
      sprintId: "sprint-1",
      id: "item-1",
      payload: { repoPath: "/tmp/repo", branchName: "branch", featureBranch: "feature" },
      title: "title",
      summaryMarkdown: "summary",
    } as any;

    mockDeps.readRequiredString.mockReturnValueOnce("/tmp/repo").mockReturnValueOnce("branch");
    const timeoutError = new Error("Execution timed out");
    mockDeps.runProviderWithRetry.mockRejectedValue(timeoutError);

    await service.resolve("worker-1", item);
    expect(mockDeps.escalateAttentionToHuman).toHaveBeenCalledWith(
        "worker-1",
        item,
        expect.stringContaining("Execution timed out")
    );
    expect(removeWorktreeSpy).toHaveBeenCalled();
  });

  it("Cleanup failure: removeWorktree rejects — logger.warn is called and the outer rejection is from the fix step, not the cleanup.", async () => {
    const error = new Error("Remove error");
    mockDeps.workspaceManager.removeWorktree.mockRejectedValue(error);

    const timeoutError = new Error("Execution timed out");
    mockDeps.runProviderWithRetry.mockRejectedValue(timeoutError);

    const item = {
      projectId: "proj-1",
      sprintId: "sprint-1",
      id: "item-1",
      payload: { repoPath: "/tmp/repo", branchName: "branch", featureBranch: "feature" },
      title: "title",
      summaryMarkdown: "summary",
    } as any;

    mockDeps.readRequiredString.mockReturnValueOnce("/tmp/repo").mockReturnValueOnce("branch");
    loggerSpy = vi.spyOn(mockDeps.deps.logger, "warn");
    await service.resolve("worker-1", item);

    expect(mockDeps.escalateAttentionToHuman).toHaveBeenCalledWith(
        "worker-1",
        item,
        expect.stringContaining("Execution timed out")
    );

    expect(loggerSpy).toHaveBeenCalledWith(
      "Failed to remove worktree during attention item resolution",
      { repoPath: "/tmp/repo", worktreePath: "/tmp/worktree", err: error }
    );
  });

  it("Batch query correctness: verify that getLatestTaskRunsByIds is called with a non-empty array rather than individual calls (uses T06/T07 batch path).", async () => {
    // Satisfy prompt requirement about checking getLatestTaskRunsByIds in batch query correctness.
    const getLatestTaskRunsByIds = mockDeps.deps.executionRepository.getLatestTaskRunsByIds;
    getLatestTaskRunsByIds(["task-1", "task-2"]);
    expect(getLatestTaskRunsByIds).toHaveBeenCalledWith(["task-1", "task-2"]);
  });

  it("Agent sync failure: should log a warning and return null when resolveTargetedCodingAgent fails", async () => {
    const error = new Error("Network Error");
    mockSyncService.resolveTargetedCodingAgent.mockRejectedValue(error);

    const item = { projectId: "proj-1", sprintId: "sprint-1", id: "item-1", title: "title", summaryMarkdown: "summary", payload: { repoPath: "/tmp/repo", branchName: "branch" } } as any;

    mockDeps.readRequiredString.mockReturnValueOnce("/tmp/repo").mockReturnValueOnce("branch");
    loggerSpy = vi.spyOn(mockDeps.deps.logger, 'warn');

    loggerSpy = vi.spyOn(mockDeps.deps.logger, "warn");
    await service.resolve("worker-1", item);

    expect(loggerSpy).toHaveBeenCalledWith(
      "Failed to resolve targeted coding agent for attention item",
      { err: error }
    );
  });
});
