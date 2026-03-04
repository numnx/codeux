import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrService } from "../../../../../src/infrastructure/providers/cli/pr-service.js";
import * as processRunner from "../../../../../src/services/cli-process-runner.js";

vi.mock("../../../../../src/services/cli-process-runner.js", () => ({
  runCommandStrict: vi.fn()
}));

describe("PrService", () => {
  let service: PrService;

  beforeEach(() => {
    service = new PrService();
    vi.clearAllMocks();
  });

  describe("resolveOrCreateFeaturePr", () => {
    it("returns existing PR URL if found", async () => {
      vi.mocked(processRunner.runCommandStrict).mockResolvedValueOnce({
        ok: true,
        stdout: JSON.stringify([{ url: "https://github.com/pr/123" }]),
        stderr: ""
      });

      const url = await service.resolveOrCreateFeaturePr({
        taskId: "T1",
        provider: "gemini",
        title: "Title",
        featureBranch: "main",
        workerBranch: "worker"
      }, "/repo");

      expect(url).toBe("https://github.com/pr/123");
      expect(processRunner.runCommandStrict).toHaveBeenCalledWith(
        "gh",
        expect.arrayContaining(["pr", "list"]),
        "/repo",
        expect.anything()
      );
    });

    it("creates a new PR if none exists", async () => {
      vi.mocked(processRunner.runCommandStrict)
        .mockResolvedValueOnce({ ok: true, stdout: "[]", stderr: "" }) // list
        .mockResolvedValueOnce({ ok: true, stdout: "https://github.com/pr/456\n", stderr: "" }); // create

      const url = await service.resolveOrCreateFeaturePr({
        taskId: "T1",
        provider: "gemini",
        title: "Title",
        featureBranch: "main",
        workerBranch: "worker"
      }, "/repo");

      expect(url).toBe("https://github.com/pr/456");
      expect(processRunner.runCommandStrict).toHaveBeenCalledWith(
        "gh",
        expect.arrayContaining(["pr", "create"]),
        "/repo",
        expect.anything()
      );
    });
  });

  describe("hasUnpushedCommits", () => {
    it("returns true if rev-list count > 0", async () => {
      const runner = vi.fn()
        .mockResolvedValueOnce({ ok: true, stdout: "", stderr: "" }) // show-ref exists
        .mockResolvedValueOnce({ ok: true, stdout: "5\n", stderr: "" }); // rev-list count

      const result = await service.hasUnpushedCommits("/repo", "worker", "main", runner);
      expect(result).toBe(true);
    });

    it("returns false if rev-list count is 0", async () => {
      const runner = vi.fn()
        .mockResolvedValueOnce({ ok: true, stdout: "", stderr: "" }) // show-ref exists
        .mockResolvedValueOnce({ ok: true, stdout: "0\n", stderr: "" }); // rev-list count

      const result = await service.hasUnpushedCommits("/repo", "worker", "main", runner);
      expect(result).toBe(false);
    });
  });
});
