import { describe, it, expect, beforeEach } from "vitest";
import { recoverWorkspaceBranch } from "../../../../src/domain/qa-review/qa-review-workspace-recovery.js";
import type { Subtask, ProviderId } from "../../../../src/contracts/app-types.js";
import type { TaskRunRecord } from "../../../../src/contracts/execution-types.js";

describe("qa-review-workspace-recovery", () => {
  let defaultArgs: any;

  beforeEach(() => {
    defaultArgs = {
      task: { id: "task-1", worker_branch: null, pr_url: null } as unknown as Subtask,
      taskRun: { id: "run-1", workerBranch: null, prUrl: null } as unknown as TaskRunRecord,
      featureBranch: "feature-xyz",
      provider: "gemini" as ProviderId,
      resolvedWorkspaceBranch: null,
      prMetadataBranch: null,
      gitBranchesListing: [],
    };
  });

  it("returns explicit worker branch from task if available", () => {
    defaultArgs.task.worker_branch = "explicit-branch";
    defaultArgs.taskRun.workerBranch = "explicit-branch";

    const result = recoverWorkspaceBranch(defaultArgs);

    expect(result.workerBranch).toBe("explicit-branch");
    expect(result.isRecovered).toBe(true);
    expect(result.metadataUpdates).toEqual({ taskWorkerBranch: null, taskRunWorkerBranch: null });
  });

  it("recovers worker branch from PR metadata if available", () => {
    defaultArgs.prMetadataBranch = "pr-branch-recovered";

    const result = recoverWorkspaceBranch(defaultArgs);

    expect(result.workerBranch).toBe("pr-branch-recovered");
    expect(result.isRecovered).toBe(true);
    expect(result.metadataUpdates.taskWorkerBranch).toBe("pr-branch-recovered");
    expect(result.metadataUpdates.taskRunWorkerBranch).toBe("pr-branch-recovered");
  });

  it("recovers worker branch from local git branches if PR metadata missing", () => {
    defaultArgs.gitBranchesListing = ["  main", "* task/feature-xyz-task-1-gemini-local", "  remotes/origin/task/feature-xyz-task-1-gemini-remote"];

    const result = recoverWorkspaceBranch(defaultArgs);

    expect(result.workerBranch).toBe("task/feature-xyz-task-1-gemini-local");
    expect(result.isRecovered).toBe(true);
  });

  it("recovers worker branch from remote git branches if local git branches missing", () => {
    defaultArgs.gitBranchesListing = ["  main", "  remotes/origin/task/feature-xyz-task-1-gemini-remote"];

    const result = recoverWorkspaceBranch(defaultArgs);

    expect(result.workerBranch).toBe("task/feature-xyz-task-1-gemini-remote");
    expect(result.isRecovered).toBe(true);
  });

  it("falls back to building deterministic worker branch if recovery fails", () => {
    const result = recoverWorkspaceBranch(defaultArgs);

    expect(result.workerBranch).toContain("task/feature-xyz-task-1-gemini-");
    expect(result.isRecovered).toBe(false);
  });

  it("throws error if branch resolution fails completely", () => {
    defaultArgs.featureBranch = "";
    defaultArgs.task.id = "";
    expect(() => recoverWorkspaceBranch(defaultArgs)).toThrow("Worker branch resolution failed and no safe fallback available.");
  });
});
