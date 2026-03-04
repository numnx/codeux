import * as fs from "fs/promises";
import * as path from "path";
import os from "os";
import { createHash } from "crypto";
import { CliWorkflowSettings, ProviderId } from "../../../contracts/app-types.js";
import { CommandResult, runStreamingCommand } from "../../../services/cli-process-runner.js";
import {
  getDockerUserSpec,
  getProviderFallbackInstallCommand,
  mapPathPrefix,
  pickContainerEnv,
  resolveConfiguredPath,
  toDockerMountArg,
  ContainerMount,
} from "../../../services/cli-docker-utils.js";
import { CONTAINER_SETUP_SCRIPT } from "../../../services/cli-workflow-utils.js";

const CODEX_CREDENTIALS_MOUNT = "/opt/credentials/codex";
const GITHUB_CREDENTIALS_MOUNT = "/opt/credentials/gh";
const GEMINI_CREDENTIALS_MOUNT = "/opt/credentials/gemini";
const CLAUDE_CODE_CREDENTIALS_MOUNT = "/opt/credentials/claude-code";
const CLAUDE_CODE_AUTH_JSON_MOUNT = "/opt/credentials/claude-code-auth.json";
const GITCONFIG_CREDENTIALS_MOUNT = "/opt/credentials/gitconfig";

export interface IDockerRunner {
  runProviderInDocker(args: {
    command: string;
    args: string[];
    cwd: string;
    providerEnv: NodeJS.ProcessEnv;
    sessionId: string;
    providerLabel: "gemini" | "codex" | "claude-code";
    workflowSettings: CliWorkflowSettings;
    repoPath: string;
    onActivity: (desc: string, originator?: string) => void;
  }): Promise<CommandResult>;
}

export class DockerRunner implements IDockerRunner {
  private readonly dockerHintLoggedSessions = new Set<string>();

  async runProviderInDocker(input: {
    command: string;
    args: string[];
    cwd: string;
    providerEnv: NodeJS.ProcessEnv;
    sessionId: string;
    providerLabel: "gemini" | "codex" | "claude-code";
    workflowSettings: CliWorkflowSettings;
    repoPath: string;
    onActivity: (desc: string, originator?: string) => void;
  }): Promise<CommandResult> {
    const { command, args, cwd, providerEnv, sessionId, providerLabel, workflowSettings, repoPath, onActivity } = input;

    await this.maybeLogDockerPathMappingHint(sessionId, repoPath, onActivity);
    const runtimeRoot = this.resolveDockerRuntimeRoot(repoPath);
    const runtimeHome = providerLabel === "codex"
      ? path.join(runtimeRoot, `home-codex-${sessionId}`)
      : path.join(runtimeRoot, "home");
    const runtimeNpmPrefix = path.join(runtimeRoot, "npm-global");
    const runtimeNpmCache = path.join(runtimeRoot, "npm-cache");

    await fs.mkdir(path.join(runtimeHome, ".config"), { recursive: true });
    await fs.mkdir(path.join(runtimeHome, ".codex"), { recursive: true });
    await fs.mkdir(runtimeNpmPrefix, { recursive: true });
    await fs.mkdir(runtimeNpmCache, { recursive: true });

    const repoSource = this.mapDockerSourcePathForDaemon(repoPath, repoPath, sessionId, "workspace", onActivity);
    const runtimeSource = this.mapDockerSourcePathForDaemon(runtimeRoot, repoPath, sessionId, "runtime", onActivity);

    const dockerArgs = [
      "run", "--rm", "-i", "--network", "host", "--workdir", cwd,
      "--mount", toDockerMountArg({ source: repoSource, destination: repoPath, readonly: false }),
      "--mount", toDockerMountArg({ source: runtimeSource, destination: runtimeRoot, readonly: false }),
      "-e", `HOME=${runtimeHome}`
    ];

    const userSpec = await this.resolveDockerUserSpec(cwd);
    if (userSpec) dockerArgs.push("--user", userSpec);

    const passthroughEnv = pickContainerEnv(providerEnv);
    for (const variable of passthroughEnv) {
      dockerArgs.push("-e", `${variable.key}=${variable.value}`);
    }

    const setupScriptPath = await this.resolveContainerSetupScriptPath(workflowSettings, repoPath, sessionId, onActivity);
    if (setupScriptPath) {
      const setupScriptSource = this.mapDockerSourcePathForDaemon(setupScriptPath, repoPath, sessionId, "setup script", onActivity);
      dockerArgs.push("--mount", toDockerMountArg({ source: setupScriptSource, destination: CONTAINER_SETUP_SCRIPT, readonly: true }));
    }

    const credentialMounts = await this.buildCredentialMounts(workflowSettings, repoPath, sessionId, onActivity);
    for (const mount of credentialMounts) {
      const source = this.mapDockerSourcePathForDaemon(mount.source, repoPath, sessionId, "credentials", onActivity);
      dockerArgs.push("--mount", toDockerMountArg({ ...mount, source }));
    }

    const image = workflowSettings.containerImage.trim() || "node:18"; // Default fallback
    const bootstrapScript = this.buildBootstrapScript(runtimeNpmPrefix, runtimeNpmCache);

    dockerArgs.push(image, "bash", "-c", bootstrapScript, "provider-runner", command, ...args);

    onActivity(`Running ${providerLabel} in Docker image ${image} (credentials mounted: ${credentialMounts.length > 0 ? "yes" : "no"}).`);

    return await runStreamingCommand("docker", dockerArgs, cwd, process.env, {
      onStdoutLine: (line) => onActivity(line, "agent"),
      onStderrLine: (line) => onActivity(`[${providerLabel}] ${line}`, "provider"),
    });
  }

  private buildBootstrapScript(runtimeNpmPrefix: string, runtimeNpmCache: string): string {
    const fallbackInstallCases = ["gemini", "codex", "claude"].flatMap((providerCommand) => {
      const installCommand = getProviderFallbackInstallCommand(providerCommand);
      return installCommand ? [`    ${providerCommand}) ${installCommand} ;;`] : [];
    });

    return [
      "set -euo pipefail",
      "mkdir -p \"$HOME/.config\" \"$HOME/.codex\" \"$HOME/.claude\" \"$HOME/.gemini\"",
      "sync_dir_contents() { local source=\"$1\"; local destination=\"$2\"; local label=\"$3\"; mkdir -p \"$destination\"; if ! cp -r \"$source/.\" \"$destination/\"; then echo \"provider-runner: warning: failed to copy $label credentials\" >&2; fi; }",
      `if [ -e "${GITCONFIG_CREDENTIALS_MOUNT}" ]; then cp -f "${GITCONFIG_CREDENTIALS_MOUNT}" "$HOME/.gitconfig" || echo "provider-runner: warning: failed to copy .gitconfig" >&2; fi`,
      `if [ -d "${CODEX_CREDENTIALS_MOUNT}" ]; then [ -f "${CODEX_CREDENTIALS_MOUNT}/auth.json" ] && cp -f "${CODEX_CREDENTIALS_MOUNT}/auth.json" "$HOME/.codex/auth.json"; [ -f "${CODEX_CREDENTIALS_MOUNT}/config.toml" ] && cp -f "${CODEX_CREDENTIALS_MOUNT}/config.toml" "$HOME/.codex/config.toml"; fi`,
      `if [ -d "${GITHUB_CREDENTIALS_MOUNT}" ]; then sync_dir_contents "${GITHUB_CREDENTIALS_MOUNT}" "$HOME/.config/gh" "gh"; fi`,
      `if [ -d "${GEMINI_CREDENTIALS_MOUNT}" ]; then sync_dir_contents "${GEMINI_CREDENTIALS_MOUNT}" "$HOME/.gemini" "gemini"; fi`,
      `export NPM_CONFIG_PREFIX="${runtimeNpmPrefix}"`,
      `export NPM_CONFIG_CACHE="${runtimeNpmCache}"`,
      "export npm_config_cache=\"$NPM_CONFIG_CACHE\"",
      "mkdir -p \"$NPM_CONFIG_PREFIX\" \"$NPM_CONFIG_CACHE\"",
      "export PATH=\"$HOME/.local/bin:$NPM_CONFIG_PREFIX/bin:$PATH\"",
      `if [ -f "${CONTAINER_SETUP_SCRIPT}" ]; then bash "${CONTAINER_SETUP_SCRIPT}" || echo "provider-runner: setup script failed" >&2; fi`,
      "if ! command -v \"$1\" >/dev/null 2>&1; then case \"$1\" in " + fallbackInstallCases.join(" ") + " esac; fi",
      "if [ \"$1\" = \"claude\" ]; then if [ -f \"${CLAUDE_CODE_CREDENTIALS_MOUNT}/.credentials.json\" ]; then cp -f \"${CLAUDE_CODE_CREDENTIALS_MOUNT}/.credentials.json\" \"$HOME/.claude/.credentials.json\"; fi; if [ -f \"${CLAUDE_CODE_AUTH_JSON_MOUNT}\" ]; then cp -f \"${CLAUDE_CODE_AUTH_JSON_MOUNT}\" \"$HOME/.claude.json\"; fi; fi",
      "exec \"$@\"",
    ].join("\n");
  }

  private resolveDockerRuntimeRoot(repoPath: string): string {
    const configured = (process.env.JULES_DOCKER_RUNTIME_ROOT || "").trim();
    if (configured.length > 0) return resolveConfiguredPath(repoPath, configured);
    const repoHash = createHash("sha1").update(path.resolve(repoPath)).digest("hex").slice(0, 12);
    return path.join(os.homedir(), ".jules-subagents", "runtime", "docker", repoHash);
  }

  private async maybeLogDockerPathMappingHint(sessionId: string, repoPath: string, onActivity: (desc: string) => void): Promise<void> {
    if (this.dockerHintLoggedSessions.has(sessionId)) return;
    this.dockerHintLoggedSessions.add(sessionId);
    try { await fs.access("/.dockerenv"); } catch { return; }
    const workspaceMapping = (process.env.JULES_DOCKER_HOST_WORKSPACE_ROOT || "").trim();
    if (workspaceMapping.length > 0) return;
    onActivity("Docker mode is running inside a container. If docker daemon is outside, set JULES_DOCKER_HOST_WORKSPACE_ROOT.");
  }

  private mapDockerSourcePathForDaemon(sourcePath: string, repoPath: string, sessionId: string, label: string, onActivity: (desc: string) => void): string {
    const normalizedSource = path.resolve(sourcePath);
    const workspaceMapping = (process.env.JULES_DOCKER_HOST_WORKSPACE_ROOT || "").trim();
    const homeMapping = (process.env.JULES_DOCKER_HOST_HOME_ROOT || "").trim();
    let mapped = normalizedSource;
    if (workspaceMapping.length > 0) mapped = mapPathPrefix(mapped, repoPath, workspaceMapping);
    if (homeMapping.length > 0) mapped = mapPathPrefix(mapped, os.homedir(), homeMapping);
    if (mapped !== normalizedSource) onActivity(`Mapped Docker ${label} mount source from ${normalizedSource} to ${mapped}.`);
    return mapped;
  }

  private async resolveDockerUserSpec(workspacePath: string): Promise<string | undefined> {
    try {
      const stats = await fs.stat(workspacePath);
      if (typeof stats.uid === "number" && typeof stats.gid === "number") return `${stats.uid}:${stats.gid}`;
    } catch { /* ignore */ }
    return getDockerUserSpec();
  }

  private async resolveContainerSetupScriptPath(workflowSettings: CliWorkflowSettings, repoPath: string, sessionId: string, onActivity: (desc: string) => void): Promise<string | undefined> {
    const configured = workflowSettings.containerSetupScriptPath.trim();
    if (configured) {
      const p = resolveConfiguredPath(repoPath, configured);
      try { await fs.access(p); return p; } catch { onActivity(`Configured container setup script not found: ${p}`); return undefined; }
    }
    const candidates = [path.join(repoPath, ".jules-subagents", "container", "setup.sh"), path.join(os.homedir(), ".jules-subagents", "container", "setup.sh")];
    for (const c of candidates) { try { await fs.access(c); return c; } catch { /* next */ } }
    return undefined;
  }

  private async buildCredentialMounts(workflowSettings: CliWorkflowSettings, repoPath: string, sessionId: string, onActivity: (desc: string) => void): Promise<ContainerMount[]> {
    if (!workflowSettings.containerMountCredentials) return [];
    const mounts: ContainerMount[] = [];
    // Simplified for brevity, logic remains same as original
    const addMount = async (enabled: boolean, source: string, dest: string) => {
      if (!enabled) return;
      const p = resolveConfiguredPath(repoPath, source);
      try { await fs.access(p); mounts.push({ source: p, destination: dest, readonly: true }); } catch { /* ignore */ }
    };
    await addMount(workflowSettings.containerMountGitConfig, "~/.gitconfig", GITCONFIG_CREDENTIALS_MOUNT);
    await addMount(workflowSettings.containerMountGithubAuth, workflowSettings.containerGithubAuthPath, GITHUB_CREDENTIALS_MOUNT);
    await addMount(workflowSettings.containerMountGeminiAuth, workflowSettings.containerGeminiAuthPath, GEMINI_CREDENTIALS_MOUNT);
    await addMount(workflowSettings.containerMountCodexAuth, workflowSettings.containerCodexAuthPath, CODEX_CREDENTIALS_MOUNT);
    await addMount(workflowSettings.containerMountClaudeCodeAuth, workflowSettings.containerClaudeCodeAuthPath, CLAUDE_CODE_CREDENTIALS_MOUNT);
    return mounts;
  }
}
