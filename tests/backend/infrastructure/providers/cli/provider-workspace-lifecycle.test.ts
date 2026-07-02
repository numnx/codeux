import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeWithWorkspace, shouldPreserveSessionWorkspace } from "../../../../../src/infrastructure/providers/cli/provider-workspace-lifecycle.js";
import type { IDockerRunner } from "../../../../../src/infrastructure/providers/cli/docker-runner.js";
import * as fs from "fs/promises";

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    mkdir: vi.fn(),
    rm: vi.fn().mockResolvedValue(undefined),
  };
});

describe("provider-workspace-lifecycle", () => {
  let dockerRunner: IDockerRunner;
  let defaultInput: any;

  beforeEach(() => {
    vi.clearAllMocks();
    dockerRunner = {
      ensureWorkspace: vi.fn().mockResolvedValue({ cwd: "/mock/workspace", cleanup: vi.fn() }),
      removeWorkspaceDir: vi.fn().mockResolvedValue(undefined),
    } as unknown as IDockerRunner;

    defaultInput = {
      provider: "codex",
      cwd: "/test/cwd",
      repoPath: "/test/repo",
      sessionId: "session-123",
      workflowSettings: {
        executionMode: "DOCKER",
      },
    };
  });

  describe("shouldPreserveSessionWorkspace", () => {
    it("returns true for DOCKER mode and non-volume cwd", () => {
      expect(shouldPreserveSessionWorkspace(defaultInput)).toBe(true);
    });

    it("returns false for non-DOCKER mode", () => {
      expect(shouldPreserveSessionWorkspace({ ...defaultInput, workflowSettings: { executionMode: "HOST" } })).toBe(false);
    });

    it("returns false for docker-volume cwd", () => {
      expect(shouldPreserveSessionWorkspace({ ...defaultInput, cwd: "docker-volume://my-vol/app" })).toBe(false);
    });
  });

  describe("executeWithWorkspace", () => {
    it("ensures workspace for DOCKER mode with preserve/reuse true", async () => {
      let callbackArgCwd = "";
      await executeWithWorkspace(dockerRunner, defaultInput, async (prepared) => {
        callbackArgCwd = prepared.cwd;
        return "result";
      });

      expect(dockerRunner.ensureWorkspace).toHaveBeenCalledWith({
        cwd: "/test/cwd",
        repoPath: "/test/repo",
        sessionId: "session-123",
        preserve: true,
        reuseExisting: true,
      });
      expect(callbackArgCwd).toBe("/mock/workspace");
    });

    it("uses workspaceSessionId if provided", async () => {
      await executeWithWorkspace(dockerRunner, { ...defaultInput, workspaceSessionId: "ws-session-456" }, async () => {
        return "result";
      });

      expect(dockerRunner.ensureWorkspace).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: "ws-session-456",
      }));
    });

    it("does not preserve for docker-volume cwd", async () => {
      await executeWithWorkspace(dockerRunner, { ...defaultInput, cwd: "docker-volume://my-vol" }, async () => {
        return "result";
      });

      expect(dockerRunner.ensureWorkspace).toHaveBeenCalledWith(expect.objectContaining({
        preserve: false,
        reuseExisting: false,
      }));
    });

    it("uses no-op cleanup for HOST mode and does not call ensureWorkspace", async () => {
      const input = { ...defaultInput, workflowSettings: { executionMode: "HOST" } };
      let callbackArgCwd = "";
      const result = await executeWithWorkspace(dockerRunner, input, async (prepared) => {
        callbackArgCwd = prepared.cwd;
        return "result";
      });

      expect(dockerRunner.ensureWorkspace).not.toHaveBeenCalled();
      expect(callbackArgCwd).toBe("/test/cwd");
      expect(result).toBe("result");
    });

    it("cleans up workspace and codex output path even if callback throws", async () => {
      const mockCleanup = vi.fn();
      dockerRunner.ensureWorkspace = vi.fn().mockResolvedValue({ cwd: "/mock/workspace", cleanup: mockCleanup });

      await expect(
        executeWithWorkspace(dockerRunner, defaultInput, async () => {
          throw new Error("Callback failed");
        })
      ).rejects.toThrow("Callback failed");

      expect(mockCleanup).toHaveBeenCalled();
      expect(dockerRunner.removeWorkspaceDir).toHaveBeenCalledWith("/mock/workspace", expect.stringContaining("provider-last-message"));
    });

    it("creates output path directory if not in /workspace/", async () => {
      const input = { ...defaultInput, workflowSettings: { executionMode: "HOST" } };
      await executeWithWorkspace(dockerRunner, input, async () => {
        return "result";
      });

      expect(fs.mkdir).toHaveBeenCalled();
    });
  });
});
