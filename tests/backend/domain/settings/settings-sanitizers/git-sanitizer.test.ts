import { describe, expect, it } from "vitest";
import { sanitizeGit } from "../../../../../src/domain/settings/settings-sanitizers/git-sanitizer.js";

describe("sanitizeGit", () => {
  it("resolves github token from external hints", () => {
    const result = sanitizeGit({}, {
      resolved: { githubToken: "gh-token", julesApiKey: "", geminiApiKey: "", codexApiKey: "", claudeCodeApiKey: "" },
      env: {},
      settingsJson: {},
    });
    expect(result.githubToken).toBe("gh-token");
  });

  it("prioritizes input token", () => {
    const result = sanitizeGit({ git: { githubToken: "explicit-gh-token" } }, {
      resolved: { githubToken: "gh-token", julesApiKey: "", geminiApiKey: "", codexApiKey: "", claudeCodeApiKey: "" },
      env: {},
      settingsJson: {},
    });
    expect(result.githubToken).toBe("explicit-gh-token");
  });

  it("trims surrounding whitespace from custom branch scheme and accepts arbitrary non-empty strings", () => {
    const result = sanitizeGit({ git: { sprintBranchScheme: "  custom/{sprintNumber}-{sprintName}  " } });
    expect(result.sprintBranchScheme).toBe("custom/{sprintNumber}-{sprintName}");
  });

  it("falls back to default scheme when empty or missing", () => {
    const resultEmpty = sanitizeGit({ git: { sprintBranchScheme: "   " } });
    expect(resultEmpty.sprintBranchScheme).toBe("feature/{sprintNumber}-{sprintName}");

    const resultMissing = sanitizeGit({});
    expect(resultMissing.sprintBranchScheme).toBe("feature/{sprintNumber}-{sprintName}");
  });
});
