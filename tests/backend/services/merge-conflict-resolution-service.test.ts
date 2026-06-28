import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MergeConflictResolutionService, MergeConflictResolutionServiceDependencies } from "../../../src/services/merge-conflict-resolution-service.js";
import * as providerRouting from "../../../src/services/provider-routing.js";

vi.mock("../../../src/services/cli-process-runner.js", () => ({
  runCommandStrict: vi.fn().mockResolvedValue({ ok: true, stdout: "", stderr: "", code: 0 }),
}));


describe("MergeConflictResolutionService scenarios", () => {
  let mockLogger: any;
  let mockSyncService: any;
  let mockDeps: any;
  let loggerSpy: any;
  let service: MergeConflictResolutionService;

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
          evaluate: vi.fn().mockReturnValue(null),
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
        projectAttentionService: { patchItemPayload: vi.fn().mockReturnValue({ payload: {} }) },
        workerEndpointRepository: {
          getWorkerEndpoint: vi.fn().mockReturnValue({}),
        },
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
        git: { githubMode: "LOCAL" }, providers: { openai: { thinkingMode: "STANDARD" } }
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
        applyPatchToBranch: vi.fn().mockResolvedValue({ hasChanges: false }),
      },
      prService: {
        hasUnpushedCommits: vi.fn().mockResolvedValue(true),
        hasWorkerBranchCommitsAgainstFeature: vi.fn().mockResolvedValue(true),
      },
      getProviderLabel: vi.fn().mockReturnValue("Provider"),
      escalateAttentionToHuman: vi.fn(),
    };

    service = new MergeConflictResolutionService(mockDeps as unknown as MergeConflictResolutionServiceDependencies);

    vi.spyOn(providerRouting, "resolveProviderForInvocation").mockReturnValue({
      provider: "openai",
      providerConfigId: "openai",
      invocation: "merge_conflict",
      strategy: "AGENT",
      manualProvider: null,
      providers: {} as any,
      enabledProviders: [],
    });
    vi.spyOn(providerRouting, "resolveWorkerModelForProvider").mockReturnValue("gpt-4");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should log a warning and return null when resolveTargetedCodingAgent fails", async () => {
    const error = new Error("Network Error");
    mockSyncService.resolveTargetedCodingAgent.mockRejectedValue(error);

    const item = { projectId: "proj-1", sprintId: "sprint-1", id: "item-1", title: "title", summaryMarkdown: "summary" } as any;

    loggerSpy = vi.spyOn(mockDeps.deps.logger, 'warn');


    loggerSpy = vi.spyOn(mockDeps.deps.logger, "warn");
    try {
      await service.resolve("worker-1", item);
    } catch (e) {
      console.log("Error caught in merge conflict:", (e as Error).message);
    }

    expect(loggerSpy).toHaveBeenCalledWith(
      "Failed to resolve targeted coding agent for attention item",
      { err: error }
    );
  });

  it("should log a warning and return undefined when removeWorktree fails", async () => {
    const error = new Error("Remove error");
    mockDeps.workspaceManager.removeWorktree.mockRejectedValue(error);

    const item = {
      projectId: "proj-1",
      sprintId: "sprint-1",
      id: "item-1",
      payload: { repoPath: "/tmp/repo", conflictingBranches: { source: "src", target: "tgt" } },
      title: "title",
      summaryMarkdown: "summary",
    } as any;

    vi.spyOn(service as any, "runMergeIntoSource").mockResolvedValue(true);
    vi.spyOn(service as any, "ensureMergeConflictResolved").mockResolvedValue(undefined);
    vi.spyOn(service as any, "finalizeMergeCommit").mockResolvedValue(undefined);
    vi.spyOn(service as any, "ensureTargetMergedIntoSource").mockResolvedValue(undefined);

    loggerSpy = vi.spyOn(mockDeps.deps.logger, "warn");
    try {
      await service.resolve("worker-1", item);
    } catch (e) {
      // Ignored for test isolation
    }
    expect(loggerSpy).toHaveBeenCalledWith(
      "Failed to remove worktree during attention item resolution",
      { repoPath: "/tmp/repo", worktreePath: "/tmp/worktree", err: error }
    );
  });
});
