import * as os from "os";
import * as path from "path";
import * as pathPosix from "path/posix";
import * as fs from "fs/promises";
import { randomUUID } from "crypto";
import { CliProviderId, ProviderCommandSpec } from "./provider-command-specs.js";
import { CliWorkflowSettings } from "../../../contracts/app-types.js";
import { CommandResult, runStreamingCommand } from "../../../services/cli-process-runner.js";
import type { IDockerRunner } from "./docker-runner.js";
import { isDockerWorkspaceMountError } from "../../../services/cli-docker-utils.js";
import { resultHasSilentQuotaSignal } from "../../../shared/providers/provider-error-classifier.js";
import type { ProviderUsageTelemetry } from "./provider-usage.js";
import { getProviderLogHandler } from "./provider-log-parser-registry.js";
import type { ProviderRunResult } from "./provider-runner.js";
import type { McpConnectionInfo } from "../../../contracts/mcp-connection-types.js";
import type { CustomMcpServer } from "../../../contracts/app-types.js";

const CONTAINER_WORKSPACE_ROOT = "/workspace";
const CONTAINER_RUNTIME_HOME = pathPosix.join(CONTAINER_WORKSPACE_ROOT, ".code-ux-home");

export interface ProviderRunLifecycleInput {
  provider: CliProviderId;
  prompt: string;
  cwd: string;
  model: string;
  sessionId: string;
  nativeSessionId: string | null;
  startedMs: number;
  workflowSettings: CliWorkflowSettings;
  repoPath: string;
  providerEnv: Record<string, string>;
  spec: { command: string; args: string[] };
  codexOutputPath?: string | null;
  antigravityLogPath?: string | null;
  dockerRunner: IDockerRunner;
  providerMountAuth?: boolean;
  providerAuthPath?: string;
  mcpConnection?: McpConnectionInfo | null;
  customMcpServers?: CustomMcpServer[];
  signal?: AbortSignal;
  onActivity: (desc: string, originator?: string) => void;
  onTelemetry?: (telemetry: ProviderUsageTelemetry) => void;
  shouldSuppressStructuredStdout: (provider: CliProviderId, line: string) => boolean;
  isTransientCodexTransportError: (result: CommandResult) => boolean;
  parseAntigravityConversationId: (cwd: string, logPath: string, executionMode: CliWorkflowSettings["executionMode"]) => Promise<string | null>;
  resolveAntigravityDatabase: (cwd: string, conversationId: string, executionMode: CliWorkflowSettings["executionMode"], hostTempDb: string) => Promise<boolean>;
  readProviderOutputPath: (cwd: string, outputPath: string, executionMode: CliWorkflowSettings["executionMode"]) => Promise<string>;
}

export async function runProviderLifecycle(input: ProviderRunLifecycleInput): Promise<ProviderRunResult> {
  const { provider, prompt, cwd, model, sessionId, workflowSettings, providerEnv, spec, dockerRunner, signal, onActivity } = input;
  let nativeSessionId = input.nativeSessionId;

  let accumulatedStdout = "";
  let accumulatedStderr = "";
  const trackingOnActivity = (desc: string, originator?: string) => {
    if (originator === "agent") {
      accumulatedStdout += desc + "\n";
    } else if (originator === "provider") {
      accumulatedStderr += desc + "\n";
    }
    onActivity(desc, originator);
  };

  const runCmd = async () => {
    if (workflowSettings.executionMode === "DOCKER") {
      const result = await dockerRunner.runProviderInDocker({
        command: spec.command, args: spec.args, cwd, providerEnv, sessionId,
        providerLabel: provider, workflowSettings, repoPath: input.repoPath, signal, onActivity: trackingOnActivity,
        providerMountAuth: input.providerMountAuth,
        providerAuthPath: input.providerAuthPath,
        mcpConnection: input.mcpConnection,
        customMcpServers: input.customMcpServers,
      });
      if (!result.ok && isDockerWorkspaceMountError(result)) {
        try { await fs.access(cwd); trackingOnActivity(`Docker could not mount workspace path (${cwd}) even though it exists locally. Path visibility mismatch.`, "provider"); } catch { /* ignore */ }
      }
      return result;
    }
    return await runStreamingCommand(spec.command, spec.args, cwd, providerEnv, {
      signal,
      onStdoutLine: (line) => {
        if (input.shouldSuppressStructuredStdout(provider, line)) {
          return;
        }
        trackingOnActivity(line, "agent");
      },
      onStderrLine: (line) => trackingOnActivity(`[${provider}] ${line}`, "provider"),
    });
  };

  let tempDbPath: string | null = null;
  let watcherTempDbPath: string | null = null;
  let activeWatcher = true;
  let watcherPromise: Promise<void> | null = null;

  const logHandler = getProviderLogHandler(provider);

  if (input.onTelemetry) {
    const watcherLoop = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      while (activeWatcher && !signal?.aborted) {
        try {
          if (provider === "antigravity") {
            if (!nativeSessionId && input.antigravityLogPath) {
              nativeSessionId = await input.parseAntigravityConversationId(cwd, input.antigravityLogPath, workflowSettings.executionMode);
            }
            if (nativeSessionId) {
              if (!watcherTempDbPath) {
                const safeSession = nativeSessionId.replace(/[^A-Za-z0-9_-]/g, "_");
                watcherTempDbPath = path.join(os.tmpdir(), `agy-temp-watcher-${safeSession}-${randomUUID()}.db`);
              }
              await input.resolveAntigravityDatabase(cwd, nativeSessionId, workflowSettings.executionMode, watcherTempDbPath);
            }
          }

          const telemetry = await logHandler.getTelemetry({
            cwd,
            executionMode: workflowSettings.executionMode,
            sessionId,
            nativeSessionId,
            startedMs: input.startedMs,
            dockerRunner,
            prompt,
            model,
            stdout: accumulatedStdout,
            stderr: accumulatedStderr,
            capturedText: "",
            antigravityLogPath: input.antigravityLogPath,
            tempDbPath: watcherTempDbPath,
          });

          if (input.onTelemetry) {
            input.onTelemetry(telemetry);
          }
        } catch (err) {
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    };
    watcherPromise = watcherLoop();
  }

  try {
    let result = await runCmd();
    if (!result.ok && provider === "codex" && input.isTransientCodexTransportError(result)) {
      trackingOnActivity("Codex transport disconnected. Retrying once automatically...");
      await new Promise(r => setTimeout(r, 1500));
      result = await runCmd();
    }

    if (provider === "antigravity" && input.antigravityLogPath) {
      const diagnostics = await readAntigravityDiagnostics(dockerRunner, cwd, input.antigravityLogPath, workflowSettings.executionMode);
      if (diagnostics) {
        result = {
          ...result,
          stderr: [result.stderr, diagnostics].filter(Boolean).join("\n"),
        };
        if (result.ok) {
          const reason = resultHasSilentQuotaSignal(provider, result)
            ? "Quota limit reached"
            : "Provider reported an error";
          trackingOnActivity(`[${provider}] ${reason}; provider stopped before completing the task.`, "provider");
          result = { ...result, ok: false };
        }
      }
    }

    const capturedText = input.codexOutputPath
      ? await input.readProviderOutputPath(cwd, input.codexOutputPath, workflowSettings.executionMode)
      : "";

    if (provider === "antigravity" && !nativeSessionId && input.antigravityLogPath) {
      nativeSessionId = await input.parseAntigravityConversationId(cwd, input.antigravityLogPath, workflowSettings.executionMode);
    }

    if (provider === "antigravity" && nativeSessionId) {
      const safeSession = nativeSessionId.replace(/[^A-Za-z0-9_-]/g, "_");
      const hostTempDb = path.join(os.tmpdir(), `agy-temp-${safeSession}-${randomUUID()}.db`);
      const resolvedDb = await input.resolveAntigravityDatabase(cwd, nativeSessionId, workflowSettings.executionMode, hostTempDb);
      if (resolvedDb) {
        tempDbPath = hostTempDb;
      }
    }

    const usageTelemetry = await logHandler.getTelemetry({
      cwd,
      executionMode: workflowSettings.executionMode,
      sessionId,
      nativeSessionId,
      startedMs: input.startedMs,
      dockerRunner,
      prompt,
      model,
      stdout: result.stdout,
      stderr: result.stderr,
      capturedText,
      antigravityLogPath: input.antigravityLogPath,
      tempDbPath,
    });

    return {
      ...result,
      usageTelemetry,
      nativeSessionId: usageTelemetry.nativeSessionId || nativeSessionId,
    };
  } finally {
    activeWatcher = false;
    if (watcherPromise) {
      await watcherPromise.catch(() => undefined);
    }
    if (watcherTempDbPath) {
      await fs.rm(watcherTempDbPath, { force: true }).catch(() => undefined);
    }
    if (tempDbPath) {
      await fs.rm(tempDbPath, { force: true }).catch(() => undefined);
    }
  }
}

async function readAntigravityDiagnostics(
    dockerRunner: IDockerRunner,
    cwd: string,
    logPath: string,
    executionMode: CliWorkflowSettings["executionMode"],
  ): Promise<string> {
    const raw = executionMode === "DOCKER"
      ? ((await dockerRunner.readWorkspaceFile?.(cwd, logPath).catch(() => null)) || "")
      : (await fs.readFile(logPath, "utf8").catch(() => ""));
    return extractAntigravityErrorLines(raw);
  }

  function extractAntigravityErrorLines(rawLog: string): string {
    if (!rawLog.trim()) {
      return "";
    }
    const signal = /agent executor error|RESOURCE_EXHAUSTED|Individual quota reached|Contact your administrator to enable overages|enable overages/i;
    const glogPrefix = /^[IWEF]\d{4}\s+[\d:.]+\s+\d+\s+\S+?:\d+\]\s*/;
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const rawLine of rawLog.split("\n")) {
      if (!signal.test(rawLine)) {
        continue;
      }
      let cleaned = rawLine.replace(glogPrefix, "").trim();
      cleaned = cleaned.replace(/^agent executor error:\s*/i, "");
      // agy repeats the message as `<msg>: <msg>`; collapse the exact duplicate to one copy.
      cleaned = cleaned.replace(/^(.+?):\s+\1$/, "$1");
      if (cleaned && !seen.has(cleaned)) {
        seen.add(cleaned);
        lines.push(cleaned);
      }
    }
    return lines.join("\n");
  }
