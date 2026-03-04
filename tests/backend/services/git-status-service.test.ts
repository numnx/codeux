import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitStatusService } from "../../../src/services/git-status-service.js";

describe("GitStatusService", () => {
  let runner: any;
  let service: GitStatusService;

  beforeEach(() => {
    runner = vi.fn().mockResolvedValue({ ok: true, stdout: "", stderr: "" });
    service = new GitStatusService("/repo", runner);
  });

  it("returns LOCAL status when mode is LOCAL", async () => {
    runner.mockImplementation(async (cmd: string, args: string[]) => {
      if (args.includes("--is-inside-work-tree")) return { ok: true, stdout: "true\n" };
      if (args.includes("--show-toplevel")) return { ok: true, stdout: "/repo\n" };
      if (args.includes("--show-current")) return { ok: true, stdout: "main\n" };
      if (cmd === "git" && args[0] === "remote") return { ok: true, stdout: "origin\n" };
      if (args.includes("--porcelain")) return { ok: true, stdout: "" };
      return { ok: true, stdout: "" };
    });

    const status = await service.getStatus("LOCAL");
    expect(status.mode).toBe("LOCAL");
    expect(status.available).toBe(true);
    expect(status.branch).toBe("main");
  });

  it("returns unavailable if not inside git worktree", async () => {
    runner.mockResolvedValue({ ok: false, stdout: "false\n", stderr: "not a git repo" });
    const status = await service.getStatus("REMOTE");
    expect(status.available).toBe(false);
    expect(status.warnings[0]).toContain("not a git repository");
  });

  it("handles REMOTE status with PRs and CI runs", async () => {
    runner.mockImplementation(async (cmd: string, args: string[]) => {
      if (args.includes("--is-inside-work-tree")) return { ok: true, stdout: "true\n" };
      if (args.includes("--show-toplevel")) return { ok: true, stdout: "/repo\n" };
      if (args.includes("--show-current")) return { ok: true, stdout: "main\n" };
      if (cmd === "git" && args[0] === "remote") return { ok: true, stdout: "origin\n" };
      if (args.includes("--porcelain")) return { ok: true, stdout: "" };
      if (cmd === "gh" && args[0] === "--version") return { ok: true, stdout: "gh version 2.0.0\n" };
      if (cmd === "gh" && args[1] === "auth") return { ok: true, stdout: "logged in\n" };
      if (cmd === "gh" && args[1] === "pr" && args[2] === "list") {
          return { ok: true, stdout: JSON.stringify([{ number: 1, title: "PR1", state: "OPEN", headRefName: "feat", baseRefName: "main" }]) };
      }
      if (cmd === "gh" && args[1] === "run" && args[2] === "list") {
          return { ok: true, stdout: JSON.stringify([{ databaseId: 101, status: "completed", conclusion: "success", headBranch: "feat" }]) };
      }
      return { ok: true, stdout: "" };
    });

    const status = await service.getStatus("REMOTE", undefined, undefined);
    expect(status.mode).toBe("REMOTE");
    expect(status.available).toBe(true);
  });

  it("merges a pull request", async () => {
    runner.mockResolvedValue({ ok: true, stdout: "merged", stderr: "" });
    const result = await service.mergePullRequest(123);
    expect(result.ok).toBe(true);
    expect(runner).toHaveBeenCalledWith(
      "gh",
      ["pr", "merge", "123", "--merge", "--delete-branch"],
      { cwd: "/repo", ghToken: undefined }
    );
  });

  it("returns error message if merge fails", async () => {
    runner.mockResolvedValue({ ok: false, stdout: "", stderr: "conflict" });
    const result = await service.mergePullRequest(123);
    expect(result.ok).toBe(false);
    expect(result.message).toBe("conflict");
  });

  it("memoizes getStatus within cache TTL window", async () => {
    let executionCount = 0;
    const service = new GitStatusService("/tmp/repo", async (command, args) => {
      const fullCmd = `${command} ${args.join(" ")}`;
      if (fullCmd.startsWith("gh --version")) {
        executionCount++;
      }
      const responses: Record<string, any> = {
        "git rev-parse --is-inside-work-tree": { ok: true, stdout: "true\n" },
        "git rev-parse --show-toplevel": { ok: true, stdout: "/tmp/repo\n" },
        "git branch --show-current": { ok: true, stdout: "main\n" },
        "git remote": { ok: true, stdout: "origin\n" },
        "git status --porcelain": { ok: true, stdout: "" },
        "gh --version": { ok: true, stdout: "gh version" },
        "gh auth status": { ok: true, stdout: "ok" },
        "gh pr list --state open --limit 50 --json number,title,url,state,isDraft,headRefName,baseRefName,mergeStateStatus,reviewDecision,updatedAt,comments,statusCheckRollup": { ok: true, stdout: "[]" },
        "gh run list --limit 50 --json databaseId,name,workflowName,status,conclusion,event,headBranch,url,updatedAt": { ok: true, stdout: "[]" },
        "gh pr list --state merged --limit 100 --json number,title,url,headRefName,baseRefName,mergedAt,mergedBy": { ok: true, stdout: "[]" },
      };
      return responses[fullCmd] || { ok: false };
    });

    GitStatusService.invalidateCache();
    await service.getStatus("REMOTE", "ghp_token", undefined, 10000);
    await service.getStatus("REMOTE", "ghp_token", undefined, 10000);

    expect(executionCount).toBe(1);
  });

  it("invalidates cache on mergePullRequest", async () => {
    let executionCount = 0;
    const service = new GitStatusService("/tmp/repo", async (command, args) => {
      const fullCmd = `${command} ${args.join(" ")}`;
      if (fullCmd.startsWith("gh --version")) {
        executionCount++;
      }
      const responses: Record<string, any> = {
        "git rev-parse --is-inside-work-tree": { ok: true, stdout: "true\n" },
        "git rev-parse --show-toplevel": { ok: true, stdout: "/tmp/repo\n" },
        "git branch --show-current": { ok: true, stdout: "main\n" },
        "git remote": { ok: true, stdout: "origin\n" },
        "git status --porcelain": { ok: true, stdout: "" },
        "gh --version": { ok: true, stdout: "gh version" },
        "gh auth status": { ok: true, stdout: "ok" },
        "gh pr list --state open --limit 50 --json number,title,url,state,isDraft,headRefName,baseRefName,mergeStateStatus,reviewDecision,updatedAt,comments,statusCheckRollup": { ok: true, stdout: "[]" },
        "gh run list --limit 50 --json databaseId,name,workflowName,status,conclusion,event,headBranch,url,updatedAt": { ok: true, stdout: "[]" },
        "gh pr list --state merged --limit 100 --json number,title,url,headRefName,baseRefName,mergedAt,mergedBy": { ok: true, stdout: "[]" },
        "gh pr merge 1 --merge": { ok: true, stdout: "merged" }
      };
      return responses[fullCmd] || { ok: true, stdout: "" };
    });

    GitStatusService.invalidateCache();
    await service.getStatus("REMOTE", "ghp_token", undefined, 10000);
    await service.mergePullRequest(1, "ghp_token");
    await service.getStatus("REMOTE", "ghp_token", undefined, 10000);

    expect(executionCount).toBe(2);
  });
});
