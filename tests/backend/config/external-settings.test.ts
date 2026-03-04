import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "os";
import fs from "fs";
import * as path from "path";
import { loadExternalSettingsHints } from "../../../src/config/external-settings.js";

vi.mock("os");
vi.mock("fs");

describe("external-settings", () => {
  const MOCK_PROJECT_ROOT = "/mock/project";
  const MOCK_HOME = "/mock/home";
  const MOCK_CWD = "/mock/cwd";

  beforeEach(() => {
    vi.spyOn(process, "cwd").mockReturnValue(MOCK_CWD);
    vi.spyOn(os, "homedir").mockReturnValue(MOCK_HOME);
    process.env.JULES_API_KEY = "";
    process.env.JULES_KEY = "";
    process.env.GEMINI_API_KEY = "";
    process.env.OPENAI_API_KEY = "";
    process.env.ANTHROPIC_API_KEY = "";
    process.env.CLAUDE_API_KEY = "";
    process.env.GH_TOKEN = "";
    process.env.GITHUB_TOKEN = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should load settings from JSON file if env is missing", () => {
    const mockSettings = {
      julesApiKey: "json-jules-key",
      geminiApiKey: "json-gemini-key",
    };

    vi.spyOn(fs, "existsSync").mockImplementation((p: string) => {
        return p.includes(".jules-subagents/settings.json");
    });
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(mockSettings));

    const hints = loadExternalSettingsHints(MOCK_PROJECT_ROOT);

    expect(hints.resolved.julesApiKey).toBe("json-jules-key");
    expect(hints.resolved.geminiApiKey).toBe("json-gemini-key");
  });

  it("should prioritize env over JSON file", () => {
    process.env.JULES_API_KEY = "env-jules-key";
    const mockSettings = {
      julesApiKey: "json-jules-key",
    };

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(mockSettings));

    const hints = loadExternalSettingsHints(MOCK_PROJECT_ROOT);

    expect(hints.resolved.julesApiKey).toBe("env-jules-key");
  });
});
