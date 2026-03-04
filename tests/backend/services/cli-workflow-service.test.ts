import { describe, expect, it, vi } from "vitest";
import { CliWorkflowService } from "../../../src/services/cli-workflow-service.js";

const buildService = (): any => {
  return new CliWorkflowService({
    sessionTracking: {} as any,
    getDashboardSettings: () => { throw new Error("not used"); },
    getGuideContent: async () => "",
    getGithubToken: () => undefined,
  }) as any;
};

describe("CliWorkflowService unpushed commit detection", () => {
  it("starts a task and returns a session", async () => {
    const deps = {
      sessionTracking: {
        findLatestFailedCliSessionForTask: vi.fn().mockReturnValue(null),
        createSession: vi.fn().mockImplementation((input) => ({ ...input, name: `sessions/${input.id}`, outputs: [] })),
        appendActivity: vi.fn(),
        updateSession: vi.fn(),
      },
      getDashboardSettings: vi.fn().mockReturnValue({ cliWorkflow: {} }),
      getGuideContent: vi.fn().mockResolvedValue("guide"),
      getGithubToken: vi.fn().mockReturnValue("token"),
      logger: { error: vi.fn() },
    };
    const service = new CliWorkflowService(deps as any);
    
    // We mock the private runTaskWorkflow to avoid side effects in this unit test
    (service as any).runTaskWorkflow = vi.fn().mockResolvedValue(undefined);

    const input = {
      provider: "gemini" as const,
      task: { id: "T1", prompt: "prompt", title: "title" } as any,
      repoPath: "/repo",
      featureBranch: "main",
      sprintNumber: 1,
    };

    const session = await service.startTask(input);

    expect(session.id).toContain("cli-gemini-");
    expect(deps.sessionTracking.createSession).toHaveBeenCalled();
    expect((service as any).runTaskWorkflow).toHaveBeenCalled();
  });

  it("detects unpushed commits when worker branch has no remote ref yet", async () => {
    const service = buildService();
    service.runCommand = async (_command: string, args: string[]) => {
      const key = args.join(" ");
      if (key === "show-ref --verify --quiet refs/remotes/origin/worker/task-1") {
        throw new Error("missing worker remote");
      }
      if (key === "show-ref --verify --quiet refs/remotes/origin/feature/test") {
        return { ok: true, stdout: "", stderr: "" };
      }
      if (key === "rev-list --count origin/feature/test..HEAD") {
        return { ok: true, stdout: "2\n", stderr: "" };
      }
      throw new Error(`unexpected call: ${key}`);
    };

    const detected = await service.hasUnpushedWorkerBranchCommits("/tmp/worktree", "worker/task-1", "feature/test");
    expect(detected).toBe(true);
  });

  it("returns false when worker branch is already pushed and has no commits ahead", async () => {
    const service = buildService();
    service.runCommand = async (_command: string, args: string[]) => {
      const key = args.join(" ");
      if (key === "show-ref --verify --quiet refs/remotes/origin/worker/task-2") {
        return { ok: true, stdout: "", stderr: "" };
      }
      if (key === "rev-list --count origin/worker/task-2..HEAD") {
        return { ok: true, stdout: "0\n", stderr: "" };
      }
      throw new Error(`unexpected call: ${key}`);
    };

    const detected = await service.hasUnpushedWorkerBranchCommits("/tmp/worktree", "worker/task-2", "feature/test");
    expect(detected).toBe(false);
  });

  it("detects existing worker-branch commits ahead of feature branch even when nothing is unpushed", async () => {
    const service = buildService();
    service.runCommand = async (_command: string, args: string[]) => {
      const key = args.join(" ");
      if (key === "show-ref --verify --quiet refs/remotes/origin/feature/test") {
        return { ok: true, stdout: "", stderr: "" };
      }
      if (key === "rev-list --count origin/feature/test..HEAD") {
        return { ok: true, stdout: "3\n", stderr: "" };
      }
      throw new Error(`unexpected call: ${key}`);
    };

    const detected = await service.hasWorkerBranchCommitsAgainstFeature("/tmp/worktree", "feature/test");
    expect(detected).toBe(true);
  });
});
