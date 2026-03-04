import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkspaceManager } from "../../../../../src/infrastructure/providers/cli/workspace-manager.js";
import * as fs from "fs/promises";
import * as path from "path";
import os from "os";

vi.mock("fs/promises");
vi.mock("../../../../../src/services/cli-process-runner.js", () => ({
  runCommandStrict: vi.fn().mockResolvedValue({ ok: true, stdout: "", stderr: "" })
}));

import { runCommandStrict } from "../../../../../src/services/cli-process-runner.js";

describe("WorkspaceManager", () => {
  let manager: WorkspaceManager;

  beforeEach(() => {
    manager = new WorkspaceManager();
    vi.clearAllMocks();
  });

  describe("buildWorktreePath", () => {
    it("should build path for DOCKER mode", () => {
      const p = manager.buildWorktreePath("/repo", "session-1", "DOCKER");
      expect(p).toBe(path.join("/repo", ".jules-subagents", "worktrees", "session-1"));
    });

    it("should build path for HOST mode using homedir", () => {
      const p = manager.buildWorktreePath("/repo", "session-1", "HOST");
      expect(p).toContain(os.homedir());
      expect(p).toContain(".jules-subagents");
      expect(p).toContain("session-1");
    });
  });

  describe("pathExists", () => {
    it("should return true if fs.access succeeds", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      expect(await (manager as any).pathExists("/test")).toBe(true);
    });

    it("should return false if fs.access fails", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("fail"));
      expect(await (manager as any).pathExists("/test")).toBe(false);
    });
  });

  describe("removeWorktreeInternal", () => {
    it("should call git worktree remove and fs.rm", async () => {
      await (manager as any).removeWorktreeInternal("/repo", "/worktree");
      expect(runCommandStrict).toHaveBeenCalledWith("git", ["worktree", "remove", "--force", "/worktree"], "/repo");
      expect(fs.rm).toHaveBeenCalledWith("/worktree", { recursive: true, force: true });
    });
  });

  describe("buildWorkspaceGuidance", () => {
    it("should return guidance with repo root and hints", async () => {
      vi.mocked(runCommandStrict).mockResolvedValue({ ok: true, stdout: "/repo-root\n", stderr: "" });
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const guidance = await manager.buildWorkspaceGuidance("Check /repo/src/index.ts", "/repo/worktree");
      expect(guidance).toContain("## Workspace Context");
      expect(guidance).toContain("Repository root: /repo-root");
      expect(guidance).toContain("Current working directory: /repo/worktree");
    });
  });
});
