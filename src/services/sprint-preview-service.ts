import * as fs from "fs/promises";
import * as path from "path";
import * as net from "net";
import os from "os";
import { fileURLToPath } from "url";
import type {
  CliWorkflowSettings,
  SprintPreviewScript,
  SprintPreviewSession,
  SprintPreviewSettings,
} from "../contracts/app-types.js";
import type { ExecutionRepository } from "../repositories/execution-repository.js";
import type { ProjectManagementRepository } from "../repositories/project-management-repository.js";
import type { SettingsRepository } from "../repositories/settings-repository.js";
import { SprintPreviewRepository } from "../repositories/sprint-preview-repository.js";
import { DockerBootstrapBuilder } from "../infrastructure/providers/cli/docker-bootstrap-builder.js";
import { DockerCredentialMountBuilder } from "../infrastructure/providers/cli/docker-credential-mount-builder.js";
import { DockerSetupImageCache } from "../infrastructure/providers/cli/docker-setup-image-cache.js";
import { resolveDockerRuntimeRoot } from "../infrastructure/providers/cli/docker-runtime-paths.js";
import { WorkspaceManager } from "../infrastructure/providers/cli/workspace-manager.js";
import { formatSprintBranch } from "../git/sprint-branch-scheme.js";
import { runCommandStrict } from "./cli-process-runner.js";
import {
  getDockerUserSpec,
  mapPathPrefix,
  pickContainerEnv,
  resolveConfiguredPath,
  toDockerMountArg,
} from "./cli-docker-utils.js";
import { CONTAINER_SETUP_SCRIPT } from "./cli-workflow-utils.js";
import {
  buildGeneratedSprintPreviewScript,
  detectSprintPreviewCommands,
  normalizePreviewPath,
  readOptionalSprintPreviewScript,
} from "./sprint-preview-utils.js";
import type { Logger } from "../shared/logging/logger.js";
import { getHomeSprintOsPath, getRepoSprintOsPath } from "../shared/config/sprint-os-paths.js";

const BUNDLED_CONTAINER_SETUP_SCRIPT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.sprint-os/container/setup.sh",
);

export interface SprintPreviewProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}

interface SprintPreviewServiceDeps {
  sprintPreviewRepository: SprintPreviewRepository;
  projectManagementRepository: ProjectManagementRepository;
  executionRepository: ExecutionRepository;
  settingsRepository: SettingsRepository;
  logger?: Logger;
}

interface PreparedStartupScript {
  mode: "auto" | "script";
  scriptPath: string;
  content: string;
  installCommand: string | null;
  buildCommand: string | null;
  runCommand: string | null;
}

export class SprintPreviewService {
  private readonly workspaceManager = new WorkspaceManager();

  constructor(private readonly deps: SprintPreviewServiceDeps) {}

  async listSessions(projectId?: string): Promise<SprintPreviewSession[]> {
    const sessions = this.deps.sprintPreviewRepository.listSessions(projectId);
    return await Promise.all(sessions.map((session) => this.refreshRuntimeState(session)));
  }

  async getSession(sessionId: string): Promise<SprintPreviewSession | null> {
    const session = this.deps.sprintPreviewRepository.getSession(sessionId);
    return session ? await this.refreshRuntimeState(session) : null;
  }

  async startSession(projectId: string, sprintId: string, options?: { rebuild?: boolean }): Promise<SprintPreviewSession> {
    const project = this.requireProject(projectId);
    const sprint = this.requireSprint(projectId, sprintId);
    const effectiveSettings = this.resolveSettings(projectId, sprintId);
    const settings = effectiveSettings.sprintPreview;
    const preparedScript = await this.prepareStartupScript(project.baseDir, settings);
    const featureBranch = sprint.featureBranch?.trim() || this.resolveSprintFeatureBranch(projectId, sprintId);
    const defaultBranch = effectiveSettings.git.defaultBranch?.trim() || project.defaultBranch?.trim() || "main";
    const worktreePath = this.workspaceManager.buildWorktreePath(project.baseDir, `preview-${sprintId}`, "DOCKER");
    await this.ensurePreviewBranchExists(project.baseDir, featureBranch, defaultBranch);
    await this.workspaceManager.prepareWorktree(project.baseDir, worktreePath, featureBranch, featureBranch);

    const existing = this.deps.sprintPreviewRepository.getSessionByProjectSprint(projectId, sprintId);
    if (existing && !options?.rebuild) {
      const refreshedExisting = await this.refreshRuntimeState(existing);
      if (refreshedExisting.status === "running" || refreshedExisting.status === "starting") {
        return refreshedExisting;
      }
    }
    if (existing && (options?.rebuild || existing.containerName || existing.containerId)) {
      await this.stopSession(existing.id);
    }

    const session = existing || this.deps.sprintPreviewRepository.createSession({
      projectId,
      sprintId,
      status: "starting",
      containerAppPort: settings.containerAppPort,
      startupScriptPath: preparedScript.scriptPath,
      startupMode: preparedScript.mode,
      installCommand: preparedScript.installCommand,
      buildCommand: preparedScript.buildCommand,
      runCommand: preparedScript.runCommand,
      lastCompletedTaskCount: this.countCompletedTasks(projectId, sprintId),
      lastSeenSprintStatus: sprint.status,
      lastKnownPath: "/",
    });

    const runtimeRoot = path.join(resolveDockerRuntimeRoot(project.baseDir), "preview", sprintId);
    const hostPort = await this.findFreePort(settings);
    const runtimeHome = path.join(runtimeRoot, "home-preview");
    const runtimeNpmPrefix = path.join(runtimeRoot, "npm-global");
    const runtimeNpmCache = path.join(runtimeRoot, "npm-cache");
    await fs.mkdir(runtimeHome, { recursive: true });
    await fs.mkdir(runtimeNpmPrefix, { recursive: true });
    await fs.mkdir(runtimeNpmCache, { recursive: true });

    const startupMountPath = "/opt/sprint-os/preview-start.sh";
    const startupRuntimePath = path.join(runtimeRoot, "start-preview.sh");
    await fs.mkdir(path.dirname(startupRuntimePath), { recursive: true });
    await fs.writeFile(startupRuntimePath, preparedScript.content, "utf8");
    await fs.chmod(startupRuntimePath, 0o755);

    const setupScriptPath = await this.resolveContainerSetupScriptPath(project.baseDir, effectiveSettings.cliWorkflow);
    const baseImage = effectiveSettings.cliWorkflow.containerImage.trim() || "node:24-bookworm";
    const resolvedImage = await new DockerSetupImageCache().resolveImage({
      baseImage,
      setupScriptPath,
      cacheEnabled: effectiveSettings.cliWorkflow.containerCacheSetupScriptImage,
      runtimeRoot,
      repoPath: project.baseDir,
      onActivity: () => undefined,
      mapSourcePathForDaemon: (sourcePath) => this.mapDockerSourcePathForDaemon(sourcePath, project.baseDir),
    });

    const repoMountReadonly = worktreePath.startsWith(project.baseDir + path.sep);
    const repoSource = this.mapDockerSourcePathForDaemon(project.baseDir, project.baseDir);
    const worktreeSource = this.mapDockerSourcePathForDaemon(worktreePath, project.baseDir);
    const runtimeSource = this.mapDockerSourcePathForDaemon(runtimeRoot, project.baseDir);
    const gitDir = path.join(project.baseDir, ".git");
    const gitDirSource = this.mapDockerSourcePathForDaemon(gitDir, project.baseDir);
    const startupScriptSource = this.mapDockerSourcePathForDaemon(startupRuntimePath, project.baseDir);
    const workflowSettings = effectiveSettings.cliWorkflow;
    const credentialMounts = await new DockerCredentialMountBuilder().build(workflowSettings, project.baseDir, () => undefined);
    const containerName = this.buildContainerName(projectId, sprintId);
    const bootstrapScript = new DockerBootstrapBuilder().build({
      runtimeNpmPrefix,
      runtimeNpmCache,
      fallbackProviders: [],
      runSetupScript: resolvedImage.runSetupScriptAtRuntime,
    });

    await runCommandStrict("docker", ["rm", "-f", containerName], project.baseDir).catch(() => undefined);

    const dockerArgs = [
      "run",
      "-d",
      "--rm",
      "--name", containerName,
      "-p", `127.0.0.1:${hostPort}:${settings.containerAppPort}`,
      "--workdir", worktreePath,
      "--label", "sprint-os.preview=true",
      "--label", `sprint-os.project-id=${projectId}`,
      "--label", `sprint-os.sprint-id=${sprintId}`,
      "--label", `sprint-os.host-port=${hostPort}`,
      "--mount", toDockerMountArg({ source: repoSource, destination: project.baseDir, readonly: repoMountReadonly }),
      "--mount", toDockerMountArg({ source: worktreeSource, destination: worktreePath, readonly: false }),
      "--mount", toDockerMountArg({ source: gitDirSource, destination: gitDir, readonly: false }),
      "--mount", toDockerMountArg({ source: runtimeSource, destination: runtimeRoot, readonly: false }),
      "--mount", toDockerMountArg({ source: startupScriptSource, destination: startupMountPath, readonly: true }),
      "-e", `HOME=${runtimeHome}`,
      "-e", `SPRINT_PREVIEW_PORT=${settings.containerAppPort}`,
      "-e", `SPRINT_PREVIEW_WORKTREE=${worktreePath}`,
      "-e", `SPRINT_PREVIEW_INSTALL_COMMAND=${preparedScript.installCommand || ""}`,
      "-e", `SPRINT_PREVIEW_BUILD_COMMAND=${preparedScript.buildCommand || ""}`,
      "-e", `SPRINT_PREVIEW_RUN_COMMAND=${preparedScript.runCommand || ""}`,
    ];

    const userSpec = await this.resolveDockerUserSpec(worktreePath);
    if (userSpec) {
      dockerArgs.push("--user", userSpec);
    }

    if (setupScriptPath && resolvedImage.runSetupScriptAtRuntime) {
      const setupScriptSource = this.mapDockerSourcePathForDaemon(setupScriptPath, project.baseDir);
      dockerArgs.push("--mount", toDockerMountArg({ source: setupScriptSource, destination: CONTAINER_SETUP_SCRIPT, readonly: true }));
    }

    for (const variable of pickContainerEnv(process.env)) {
      dockerArgs.push("-e", `${variable.key}=${variable.value}`);
    }

    for (const mount of credentialMounts) {
      dockerArgs.push("--mount", toDockerMountArg({
        ...mount,
        source: this.mapDockerSourcePathForDaemon(mount.source, project.baseDir),
      }));
    }

    dockerArgs.push(resolvedImage.image, "bash", "-c", bootstrapScript, "preview-runner", "bash", startupMountPath);

    const startResult = await runCommandStrict("docker", dockerArgs, project.baseDir);
    const containerId = startResult.stdout.trim();

    const updated = this.deps.sprintPreviewRepository.updateSession(session.id, {
      status: "starting",
      hostPort,
      containerAppPort: settings.containerAppPort,
      containerId,
      containerName,
      worktreePath,
      featureBranch,
      startupScriptPath: preparedScript.scriptPath,
      startupMode: preparedScript.mode,
      installCommand: preparedScript.installCommand,
      buildCommand: preparedScript.buildCommand,
      runCommand: preparedScript.runCommand,
      lastCompletedTaskCount: this.countCompletedTasks(projectId, sprintId),
      lastSeenSprintStatus: sprint.status,
      lastKnownPath: "/",
      healthStatus: "unknown",
      lastError: null,
      lastBuildAt: new Date().toISOString(),
      lastStartedAt: new Date().toISOString(),
    });

    await this.waitForReadiness(updated, 25_000);
    return await this.refreshRuntimeState(updated);
  }

  async rebuildSession(sessionId: string): Promise<SprintPreviewSession> {
    const session = await this.requireSession(sessionId);
    return await this.startSession(session.projectId, session.sprintId, { rebuild: true });
  }

  async stopSession(sessionId: string): Promise<SprintPreviewSession> {
    const session = await this.requireSession(sessionId);
    if (session.containerId || session.containerName) {
      await runCommandStrict("docker", ["rm", "-f", session.containerId || session.containerName || session.id], session.worktreePath || process.cwd()).catch(() => undefined);
    }
    return this.deps.sprintPreviewRepository.updateSession(sessionId, {
      status: "stopped",
      containerId: null,
      containerName: null,
      healthStatus: "unknown",
      lastStoppedAt: new Date().toISOString(),
    });
  }

  async getLogs(sessionId: string, tail = 200): Promise<{ logs: string }> {
    const session = await this.requireSession(sessionId);
    if (!session.containerId && !session.containerName) {
      return { logs: "" };
    }
    try {
      const result = await runCommandStrict(
        "docker",
        ["logs", "--tail", String(Math.max(1, tail)), session.containerId || session.containerName || session.id],
        session.worktreePath || process.cwd(),
      );
      return { logs: result.stdout || result.stderr || "" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { logs: message };
    }
  }

  async getScript(projectId: string, sprintId: string): Promise<SprintPreviewScript> {
    const project = this.requireProject(projectId);
    this.requireSprint(projectId, sprintId);
    const settings = this.resolveSettings(projectId, sprintId).sprintPreview;
    const scriptPath = resolveConfiguredPath(project.baseDir, settings.startupScriptPath);
    const script = await readOptionalSprintPreviewScript(scriptPath);
    const detected = await detectSprintPreviewCommands(project.baseDir);

    return {
      projectId,
      sprintId,
      path: scriptPath,
      exists: script.exists,
      mode: script.exists ? "script" : "auto",
      content: script.exists ? script.content : buildGeneratedSprintPreviewScript(),
      detectedInstallCommand: detected.installCommand,
      detectedBuildCommand: detected.buildCommand,
      detectedRunCommand: detected.runCommand,
    };
  }

  async saveScript(projectId: string, sprintId: string, content: string): Promise<SprintPreviewScript> {
    const project = this.requireProject(projectId);
    this.requireSprint(projectId, sprintId);
    const settings = this.resolveSettings(projectId, sprintId).sprintPreview;
    const scriptPath = resolveConfiguredPath(project.baseDir, settings.startupScriptPath);
    await fs.mkdir(path.dirname(scriptPath), { recursive: true });
    await fs.writeFile(scriptPath, content, "utf8");
    await fs.chmod(scriptPath, 0o755);
    return await this.getScript(projectId, sprintId);
  }

  async proxyRequest(args: {
    sessionId: string;
    method: string;
    path: string;
    headers?: Record<string, string | undefined>;
    body?: Buffer;
  }): Promise<SprintPreviewProxyResponse> {
    const session = await this.requireSession(args.sessionId);
    const refreshed = await this.refreshRuntimeState(session);
    if (!refreshed.hostPort) {
      throw new Error("Preview session does not have an active host port.");
    }

    const upstreamUrl = new URL(normalizePreviewPath(args.path), `http://127.0.0.1:${refreshed.hostPort}`);
    const response = await fetch(upstreamUrl, {
      method: args.method,
      headers: this.buildProxyHeaders(args.headers),
      body: args.body && args.body.length > 0 ? new Uint8Array(args.body) : undefined,
      redirect: "manual",
    });

    const contentType = response.headers.get("content-type") || "";
    const rewritePrefix = `/api/browser/sessions/${refreshed.id}/proxy`;
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        return;
      }
      if (key.toLowerCase() === "location") {
        responseHeaders[key] = this.rewriteLocationHeader(value, rewritePrefix, upstreamUrl.origin);
        return;
      }
      responseHeaders[key] = value;
    });

    const bodyBuffer = Buffer.from(await response.arrayBuffer());
    const rewrittenBody = this.shouldRewriteBody(contentType)
      ? Buffer.from(this.rewriteProxyBody(bodyBuffer.toString("utf8"), rewritePrefix))
      : bodyBuffer;

    this.deps.sprintPreviewRepository.updateSession(refreshed.id, {
      lastKnownPath: normalizePreviewPath(args.path),
      healthStatus: "healthy",
      status: refreshed.status === "error" ? "running" : refreshed.status,
      lastError: null,
    });

    if (this.shouldRewriteBody(contentType)) {
      responseHeaders["content-length"] = String(rewrittenBody.byteLength);
    }

    return {
      status: response.status,
      headers: responseHeaders,
      body: rewrittenBody,
    };
  }

  async reconcileSessions(): Promise<void> {
    const sessions = this.deps.sprintPreviewRepository.listSessions();
    for (const session of sessions) {
      const sprint = this.deps.projectManagementRepository.getSprint(session.sprintId);
      if (!sprint) {
        continue;
      }
      const settings = this.resolveSettings(session.projectId, session.sprintId).sprintPreview;
      const refreshed = await this.refreshRuntimeState(session);
      const completedTaskCount = this.countCompletedTasks(session.projectId, session.sprintId);
      const activeRun = this.deps.executionRepository.getProjectExecutionSnapshot(session.projectId)
        .sprintRuns
        .some((run) => run.sprintId === session.sprintId && (run.status === "running" || run.status === "queued" || run.status === "paused"));

      if (settings.autoStartOnRunningSprint && activeRun && refreshed.status === "stopped") {
        await this.startSession(session.projectId, session.sprintId).catch((error) => {
          this.deps.logger?.warn("Failed to auto-start sprint preview session", {
            sessionId: session.id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
        continue;
      }

      if (settings.autoStopOnTerminalSprint && !activeRun && (sprint.status === "completed" || sprint.status === "failed" || sprint.status === "cancelled")) {
        if (refreshed.status !== "stopped") {
          await this.stopSession(refreshed.id).catch(() => undefined);
        }
        continue;
      }

      if (refreshed.status !== "running" && refreshed.status !== "starting") {
        continue;
      }

      if (settings.rebuildOnTaskCompletion && completedTaskCount > refreshed.lastCompletedTaskCount) {
        await this.rebuildSession(refreshed.id).catch((error) => {
          this.deps.logger?.warn("Failed to auto-rebuild sprint preview after task completion", {
            sessionId: refreshed.id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
        continue;
      }

      if (
        settings.rebuildOnSprintCompletion
        && sprint.status === "completed"
        && refreshed.lastSeenSprintStatus !== "completed"
      ) {
        await this.rebuildSession(refreshed.id).catch((error) => {
          this.deps.logger?.warn("Failed to auto-rebuild sprint preview after sprint completion", {
            sessionId: refreshed.id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
        continue;
      }

      this.deps.sprintPreviewRepository.updateSession(refreshed.id, {
        lastCompletedTaskCount: completedTaskCount,
        lastSeenSprintStatus: sprint.status,
      });
    }

    const projects = this.deps.projectManagementRepository.listProjects().projects;
    for (const project of projects) {
      const execution = this.deps.executionRepository.getProjectExecutionSnapshot(project.id);
      const activeSprintRunIds = new Set(
        execution.sprintRuns
          .filter((run) => run.status === "running" || run.status === "queued" || run.status === "paused")
          .map((run) => run.sprintId),
      );
      for (const sprint of this.deps.projectManagementRepository.listSprints(project.id).sprints) {
        if (!activeSprintRunIds.has(sprint.id)) {
          continue;
        }
        const existing = this.deps.sprintPreviewRepository.getSessionByProjectSprint(project.id, sprint.id);
        const settings = this.resolveSettings(project.id, sprint.id).sprintPreview;
        if (!existing && settings.autoStartOnRunningSprint) {
          await this.startSession(project.id, sprint.id).catch(() => undefined);
        }
      }
    }
  }

  private async refreshRuntimeState(session: SprintPreviewSession): Promise<SprintPreviewSession> {
    if (!session.containerId && !session.containerName) {
      return session;
    }

    const status = await this.inspectContainerStatus(session.containerId || session.containerName || session.id, session.worktreePath || process.cwd());
    if (!status) {
      return this.deps.sprintPreviewRepository.updateSession(session.id, {
        status: "stopped",
        containerId: null,
        containerName: null,
        healthStatus: "unknown",
      });
    }

    const healthStatus = session.hostPort ? await this.fetchHealthStatus(session.hostPort) : "unknown";
    return this.deps.sprintPreviewRepository.updateSession(session.id, {
      status: healthStatus === "healthy" ? "running" : "starting",
      healthStatus,
    });
  }

  private buildProxyHeaders(headers: Record<string, string | undefined> = {}): Record<string, string> {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (!value) continue;
      const normalized = key.toLowerCase();
      if (normalized === "host" || normalized === "content-length" || normalized === "accept-encoding") {
        continue;
      }
      next[key] = value;
    }
    return next;
  }

  private shouldRewriteBody(contentType: string): boolean {
    const normalized = contentType.toLowerCase();
    return normalized.includes("text/html")
      || normalized.includes("text/css")
      || normalized.includes("javascript")
      || normalized.includes("application/xhtml+xml");
  }

  private rewriteLocationHeader(location: string, rewritePrefix: string, upstreamOrigin: string): string {
    if (!location) return location;
    if (location.startsWith("/")) {
      return `${rewritePrefix}${location}`;
    }
    if (location.startsWith(upstreamOrigin)) {
      return `${rewritePrefix}${location.slice(upstreamOrigin.length)}`;
    }
    return location;
  }

  private rewriteProxyBody(body: string, rewritePrefix: string): string {
    return body
      .replace(/(href|src|action)=("|')\/(?!\/)/g, `$1=$2${rewritePrefix}/`)
      .replace(/url\((['"]?)\/(?!\/)/g, `url($1${rewritePrefix}/`)
      .replace(/fetch\((['"])\/(?!\/)/g, `fetch($1${rewritePrefix}/`)
      .replace(/import\((['"])\/(?!\/)/g, `import($1${rewritePrefix}/`)
      .replace(/XMLHttpRequest\(\)\.open\((['"][A-Z]+['"]\s*,\s*['"])\/(?!\/)/g, `XMLHttpRequest().open($1${rewritePrefix}/`);
  }

  private async waitForReadiness(session: SprintPreviewSession, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!session.hostPort) {
        return;
      }
      const healthStatus = await this.fetchHealthStatus(session.hostPort);
      if (healthStatus === "healthy") {
        this.deps.sprintPreviewRepository.updateSession(session.id, {
          status: "running",
          healthStatus,
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  private async fetchHealthStatus(hostPort: number): Promise<"healthy" | "unreachable"> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      try {
        await fetch(`http://127.0.0.1:${hostPort}/`, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      return "healthy";
    } catch {
      return "unreachable";
    }
  }

  private async inspectContainerStatus(containerRef: string, cwd: string): Promise<string | null> {
    try {
      const result = await runCommandStrict("docker", ["inspect", "--format", "{{.State.Status}}", containerRef], cwd);
      const status = result.stdout.trim();
      return status.length > 0 ? status : null;
    } catch {
      return null;
    }
  }

  private async prepareStartupScript(repoPath: string, settings: SprintPreviewSettings): Promise<PreparedStartupScript> {
    const scriptPath = resolveConfiguredPath(repoPath, settings.startupScriptPath);
    const script = await readOptionalSprintPreviewScript(scriptPath);
    const detected = await detectSprintPreviewCommands(repoPath);

    if (script.exists) {
      return {
        mode: "script",
        scriptPath,
        content: script.content,
        installCommand: detected.installCommand,
        buildCommand: detected.buildCommand,
        runCommand: detected.runCommand,
      };
    }

    return {
      mode: "auto",
      scriptPath,
      content: buildGeneratedSprintPreviewScript(),
      installCommand: detected.installCommand,
      buildCommand: detected.buildCommand,
      runCommand: detected.runCommand,
    };
  }

  private async ensurePreviewBranchExists(repoPath: string, featureBranch: string, defaultBranch: string): Promise<void> {
    await this.fetchOriginIfAvailable(repoPath);

    if (await this.localBranchExists(repoPath, featureBranch)) {
      return;
    }
    if (await this.remoteBranchExists(repoPath, featureBranch)) {
      return;
    }

    const baseRef = await this.resolvePreviewBranchBaseRef(repoPath, defaultBranch);
    try {
      await runCommandStrict("git", ["branch", featureBranch, baseRef], repoPath);
    } catch (error) {
      if (!(await this.localBranchExists(repoPath, featureBranch))) {
        throw error;
      }
    }
  }

  private async fetchOriginIfAvailable(repoPath: string): Promise<void> {
    try {
      await runCommandStrict("git", ["remote", "get-url", "origin"], repoPath);
    } catch {
      return;
    }

    try {
      await runCommandStrict("git", ["fetch", "origin"], repoPath);
    } catch {
      // Worktree preparation will retry fetch with stale-git repair if needed.
    }
  }

  private async resolvePreviewBranchBaseRef(repoPath: string, defaultBranch: string): Promise<string> {
    if (await this.localBranchExists(repoPath, defaultBranch)) {
      return defaultBranch;
    }
    if (await this.remoteTrackingRefExists(repoPath, defaultBranch)) {
      return `origin/${defaultBranch}`;
    }
    return "HEAD";
  }

  private async localBranchExists(repoPath: string, branch: string): Promise<boolean> {
    try {
      await runCommandStrict("git", ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], repoPath);
      return true;
    } catch {
      return false;
    }
  }

  private async remoteTrackingRefExists(repoPath: string, branch: string): Promise<boolean> {
    try {
      await runCommandStrict("git", ["show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`], repoPath);
      return true;
    } catch {
      return false;
    }
  }

  private async remoteBranchExists(repoPath: string, branch: string): Promise<boolean> {
    try {
      const result = await runCommandStrict("git", ["ls-remote", "--heads", "origin", branch], repoPath);
      return result.stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  private countCompletedTasks(projectId: string, sprintId: string): number {
    return this.deps.projectManagementRepository.listTasks(projectId, sprintId)
      .filter((task) => task.status === "completed")
      .length;
  }

  private requireProject(projectId: string) {
    const project = this.deps.projectManagementRepository.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return project;
  }

  private requireSprint(projectId: string, sprintId: string) {
    const sprint = this.deps.projectManagementRepository.getSprint(sprintId);
    if (!sprint || sprint.projectId !== projectId) {
      throw new Error(`Sprint not found in project: ${sprintId}`);
    }
    return sprint;
  }

  private async requireSession(sessionId: string): Promise<SprintPreviewSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Sprint preview session not found: ${sessionId}`);
    }
    return session;
  }

  private resolveSettings(projectId: string, sprintId: string) {
    return this.deps.settingsRepository.resolveSprintDashboardSettings(projectId, sprintId).settings;
  }

  private resolveSprintFeatureBranch(projectId: string, sprintId: string): string {
    const sprint = this.requireSprint(projectId, sprintId);
    if (sprint.featureBranch?.trim()) {
      return sprint.featureBranch.trim();
    }
    const settings = this.resolveSettings(projectId, sprintId);
    const sprintNumber = typeof sprint.number === "number" ? sprint.number : 0;
    return formatSprintBranch(settings.git.sprintBranchScheme, sprintNumber);
  }

  private async findFreePort(settings: SprintPreviewSettings): Promise<number> {
    const candidates: number[] = [];
    for (let port = settings.hostPortRangeStart; port <= settings.hostPortRangeEnd; port += 1) {
      candidates.push(port);
    }
    const randomized = candidates.sort(() => Math.random() - 0.5);
    for (const port of randomized) {
      const available = await this.checkPortAvailable(port);
      if (available) {
        return port;
      }
    }
    throw new Error(`No free preview ports available in range ${settings.hostPortRangeStart}-${settings.hostPortRangeEnd}.`);
  }

  private async checkPortAvailable(port: number): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, "127.0.0.1");
    });
  }

  private mapDockerSourcePathForDaemon(sourcePath: string, repoPath: string): string {
    const normalizedSource = path.resolve(sourcePath);
    const workspaceMapping = (process.env.JULES_DOCKER_HOST_WORKSPACE_ROOT || "").trim();
    const homeMapping = (process.env.JULES_DOCKER_HOST_HOME_ROOT || "").trim();
    let mapped = normalizedSource;
    if (workspaceMapping.length > 0) mapped = mapPathPrefix(mapped, repoPath, workspaceMapping);
    if (homeMapping.length > 0) mapped = mapPathPrefix(mapped, os.homedir(), homeMapping);
    return mapped;
  }

  private async resolveDockerUserSpec(worktreePath: string): Promise<string | undefined> {
    try {
      const stats = await fs.stat(worktreePath);
      if (typeof stats.uid === "number" && typeof stats.gid === "number") {
        return `${stats.uid}:${stats.gid}`;
      }
    } catch {
      return getDockerUserSpec();
    }
    return getDockerUserSpec();
  }

  private async resolveContainerSetupScriptPath(repoPath: string, workflowSettings: CliWorkflowSettings): Promise<string | undefined> {
    const configured = workflowSettings.containerSetupScriptPath.trim();
    if (configured) {
      const resolved = resolveConfiguredPath(repoPath, configured);
      try {
        await fs.access(resolved);
        return resolved;
      } catch {
        return undefined;
      }
    }
    const candidates = [
      getRepoSprintOsPath(repoPath, "container", "setup.sh"),
      getHomeSprintOsPath("container", "setup.sh"),
      BUNDLED_CONTAINER_SETUP_SCRIPT,
    ];
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        continue;
      }
    }
    return undefined;
  }

  private buildContainerName(projectId: string, sprintId: string): string {
    const sanitize = (value: string) => value.toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").slice(0, 24);
    return `sprint-os-preview-${sanitize(projectId)}-${sanitize(sprintId)}`.slice(0, 63);
  }
}
