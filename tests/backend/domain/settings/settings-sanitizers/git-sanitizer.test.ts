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

  it("prioritizes input defaultSprintKey and falls back to default", () => {
    const defaultResult = sanitizeGit({});
    expect(defaultResult.defaultSprintKey).toBe("SPR");

    const inputResult = sanitizeGit({ git: { defaultSprintKey: "DEV" } });
    expect(inputResult.defaultSprintKey).toBe("DEV");
  });
});
