import { describe, it, expect, vi, Mock, beforeEach } from "vitest";
import * as fs from "fs/promises";
import { DockerBootstrapBuilder } from "../../../../../src/infrastructure/providers/cli/docker-bootstrap-builder.js";
import { DockerCredentialMountBuilder } from "../../../../../src/infrastructure/providers/cli/docker-credential-mount-builder.js";
import { CliWorkflowSettings } from "../../../../../src/contracts/app-types.js";
import { CONTAINER_SETUP_SCRIPT } from "../../../../../src/services/cli-workflow-utils.js";

vi.mock("fs/promises");

describe("DockerBootstrapBuilder", () => {
  const builder = new DockerBootstrapBuilder();

  it("should build a complete script with default options", () => {
    const options = {
      runtimeNpmPrefix: "/runtime/npm-global",
      runtimeNpmCache: "/runtime/npm-cache",
    };

    const script = builder.build(options);

    expect(script).toMatchSnapshot();
  });

  it("should include fallback install cases for specified providers", () => {
    const options = {
      runtimeNpmPrefix: "/runtime/npm-global",
      runtimeNpmCache: "/runtime/npm-cache",
      fallbackProviders: ["gemini"],
    };

    const script = builder.build(options);

    expect(script).toMatchSnapshot();
  });

  it("should handle claude specific auth", () => {
    const options = {
      runtimeNpmPrefix: "/runtime/npm-global",
      runtimeNpmCache: "/runtime/npm-cache",
    };

    const script = builder.build(options);

    expect(script).toContain("if [ \"$1\" = \"claude\" ]; then");
    expect(script).toMatchSnapshot();
  });

  it("should not include fallback install if no providers specified", () => {
    const options = {
      runtimeNpmPrefix: "/runtime/npm-global",
      runtimeNpmCache: "/runtime/npm-cache",
      fallbackProviders: [],
    };

    const script = builder.build(options);
    expect(script).toMatchSnapshot();
  });
});

describe("DockerCredentialMountBuilder", () => {
  const builder = new DockerCredentialMountBuilder();
  const baseSettings: Partial<CliWorkflowSettings> = {
    containerMountCredentials: true,
    containerMountGitConfig: true,
    containerMountGithubAuth: true,
    containerMountGeminiAuth: true,
    containerMountCodexAuth: true,
    containerMountClaudeCodeAuth: true,
    containerGithubAuthPath: "/path/github",
    containerGeminiAuthPath: "/path/gemini",
    containerCodexAuthPath: "/path/codex",
    containerClaudeCodeAuthPath: "/path/claude",
  };

  const defaultOptions = {
    workflowSettings: baseSettings as CliWorkflowSettings,
    repoPath: "/repo",
    onActivity: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty mounts if containerMountCredentials is false", async () => {
    const options = {
      ...defaultOptions,
      workflowSettings: { ...baseSettings, containerMountCredentials: false } as CliWorkflowSettings,
    };

    const mounts = await builder.buildMounts(options);
    expect(mounts).toEqual([]);
    expect(fs.access).not.toHaveBeenCalled();
  });

  it("should mount specific credentials when enabled and path exists", async () => {
    (fs.access as Mock).mockResolvedValue(undefined); // Simulate paths existing

    const mounts = await builder.buildMounts(defaultOptions);

    expect(mounts.length).toBe(5);
    expect(mounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: "/opt/credentials/gitconfig" }),
        expect.objectContaining({ destination: "/opt/credentials/gh" }),
        expect.objectContaining({ destination: "/opt/credentials/gemini" }),
        expect.objectContaining({ destination: "/opt/credentials/codex" }),
        expect.objectContaining({ destination: "/opt/credentials/claude-code" }),
      ])
    );
    expect(defaultOptions.onActivity).not.toHaveBeenCalled();
  });

  it("should log activity and not mount if path does not exist", async () => {
    const error = new Error("ENOENT");
    (fs.access as Mock).mockRejectedValue(error);

    const mounts = await builder.buildMounts(defaultOptions);

    expect(mounts.length).toBe(0);
    expect(defaultOptions.onActivity).toHaveBeenCalledTimes(5);
    expect(defaultOptions.onActivity).toHaveBeenCalledWith(expect.stringContaining("Configured gitconfig credential mount not found:"));
    expect(defaultOptions.onActivity).toHaveBeenCalledWith(expect.stringContaining("Configured github credential mount not found:"));
  });

  it("should respect individual toggles", async () => {
    (fs.access as Mock).mockResolvedValue(undefined);
    const options = {
      ...defaultOptions,
      workflowSettings: {
        ...baseSettings,
        containerMountGitConfig: true,
        containerMountGithubAuth: false,
        containerMountGeminiAuth: false,
        containerMountCodexAuth: true,
        containerMountClaudeCodeAuth: false,
      } as CliWorkflowSettings,
    };

    const mounts = await builder.buildMounts(options);
    expect(mounts.length).toBe(2);
    expect(mounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: "/opt/credentials/gitconfig" }),
        expect.objectContaining({ destination: "/opt/credentials/codex" }),
      ])
    );
  });
});
