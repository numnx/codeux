import { describe, it, expect, vi } from "vitest";
import { createGitHostCli } from "../../../../src/infrastructure/git/git-host-cli.js";

describe("GitHostCli", () => {
  const repoPath = "/test/repo";

  describe("GithubHostCli", () => {
    it("should invoke gh with standard arguments", async () => {
      const runner = vi.fn().mockResolvedValue({ ok: true, code: 0, stdout: "{}", stderr: "" });
      const cli = createGitHostCli("github", runner, repoPath);

      await cli.prListOpen("gh-token");
      expect(runner).toHaveBeenCalledWith("gh", [
        "pr", "list", "--state", "open", "--limit", "50", "--json",
        "number,title,url,state,isDraft,headRefName,baseRefName,mergeStateStatus,reviewDecision,updatedAt,comments,statusCheckRollup"
      ], { cwd: repoPath, hostToken: "gh-token" });
    });
  });

  describe("GitlabHostCli", () => {
    it("should invoke glab with mapped JSON output for PR list", async () => {
      const gitlabResponse = [
        {
          iid: 42,
          title: "Test MR",
          web_url: "https://gitlab.com/test",
          draft: false,
          source_branch: "feat",
          target_branch: "main",
          has_conflicts: false,
          detailed_merge_status: "mergeable",
          updated_at: "2023-10-01",
          user_notes_count: 5
        }
      ];

      const runner = vi.fn().mockResolvedValue({ ok: true, code: 0, stdout: JSON.stringify(gitlabResponse), stderr: "" });
      const cli = createGitHostCli("gitlab", runner, repoPath);

      const result = await cli.prListOpen("glab-token");
      expect(runner).toHaveBeenCalledWith("glab", [
        "mr", "list", "--state", "opened", "--per-page", "50", "--output", "json"
      ], { cwd: repoPath, hostToken: "glab-token" });

      const parsed = JSON.parse(result.stdout);
      expect(parsed[0]).toEqual({
        number: 42,
        title: "Test MR",
        url: "https://gitlab.com/test",
        state: "OPEN",
        isDraft: false,
        headRefName: "feat",
        baseRefName: "main",
        mergeStateStatus: "CLEAN",
        reviewDecision: null,
        updatedAt: "2023-10-01",
        comments: 5,
        statusCheckRollup: []
      });
    });

    it("should invoke glab for CI list and map JSON", async () => {
      const gitlabResponse = [
        {
          id: 123,
          name: "Test Pipeline",
          status: "success",
          source: "push",
          ref: "main",
          web_url: "https://gitlab.com/pipe",
          updated_at: "2023-10-02"
        }
      ];

      const runner = vi.fn().mockResolvedValue({ ok: true, code: 0, stdout: JSON.stringify(gitlabResponse), stderr: "" });
      const cli = createGitHostCli("gitlab", runner, repoPath);

      const result = await cli.runList("glab-token");
      const parsed = JSON.parse(result.stdout);
      expect(parsed[0]).toEqual({
        databaseId: 123,
        name: "Test Pipeline",
        workflowName: null,
        status: "completed",
        conclusion: "success",
        event: "push",
        headBranch: "main",
        url: "https://gitlab.com/pipe",
        updatedAt: "2023-10-02"
      });
    });
  });

  describe("LocalHostCli", () => {
    it("should return unavailable for local provider", async () => {
      const cli = createGitHostCli("local", vi.fn(), repoPath);
      const res = await cli.prListOpen();
      expect(res.ok).toBe(false);
      expect(res.stderr).toContain("unavailable");
    });
  });
});
