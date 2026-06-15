import * as pathPosix from "path/posix";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { ProviderId } from "../../../contracts/app-types.js";
import { CliProviderId } from "./provider-command-specs.js";
import type { IDockerRunner } from "./docker-runner.js";
import { CliWorkflowSettings } from "../../../contracts/app-types.js";
import { ProviderUsageTelemetry, collectProviderUsageTelemetry, QwenUsageTotals, ParsedConversationTurn, readQwenOpenAiLogRecords, sumQwenOpenAiUsage, buildQwenConversation } from "./provider-usage.js";

const CONTAINER_WORKSPACE_ROOT = "/workspace";
const CONTAINER_RUNTIME_HOME = pathPosix.join(CONTAINER_WORKSPACE_ROOT, ".code-ux-home");
const QWEN_OPENAI_LOG_DIRNAME = "qwen-openai-logs";
const CONTAINER_QWEN_OPENAI_LOG_DIR = pathPosix.join(CONTAINER_RUNTIME_HOME, QWEN_OPENAI_LOG_DIRNAME);

export interface LogHandlerContext {
  cwd: string;
  executionMode: CliWorkflowSettings["executionMode"];
  sessionId: string;
  nativeSessionId: string | null;
  startedMs: number;
  dockerRunner: IDockerRunner;
  prompt: string;
  model: string;
  stdout: string;
  stderr: string;
  capturedText: string;
  antigravityLogPath?: string | null;
  tempDbPath?: string | null;
}

export interface IProviderLogHandler {
  getTelemetry(ctx: LogHandlerContext): Promise<ProviderUsageTelemetry>;
}

export function getProviderLogHandler(providerId: CliProviderId): IProviderLogHandler {
  switch (providerId) {
    case "claude-code": return new ClaudeLogHandler();
    case "codex": return new CodexLogHandler();
    case "qwen-code": return new QwenLogHandler();
    case "opencode": return new OpenCodeLogHandler();
    case "antigravity": return new AntigravityLogHandler();
    case "gemini": return new GeminiLogHandler();
    default:
      return new DefaultLogHandler(providerId);
  }
}

class DefaultLogHandler implements IProviderLogHandler {
  constructor(protected providerId: CliProviderId) {}
  async getTelemetry(ctx: LogHandlerContext): Promise<ProviderUsageTelemetry> {
    return collectProviderUsageTelemetry({
      provider: this.providerId as any,
      model: ctx.model,
      prompt: ctx.prompt,
      cwd: ctx.cwd,
      stdout: ctx.stdout,
      stderr: ctx.stderr,
      capturedText: ctx.capturedText,
      nativeSessionId: ctx.nativeSessionId,
      startTimeMs: ctx.startedMs,
      executionMode: ctx.executionMode,
    });
  }
}

class GeminiLogHandler extends DefaultLogHandler {
  constructor() { super("gemini"); }
}

class OpenCodeLogHandler extends DefaultLogHandler {
  constructor() { super("opencode"); }
}

class ClaudeLogHandler implements IProviderLogHandler {
  async getTelemetry(ctx: LogHandlerContext): Promise<ProviderUsageTelemetry> {
    const claudeSessionJsonl = ctx.nativeSessionId
      ? await this.readClaudeSessionJsonl(ctx.dockerRunner, ctx.cwd, ctx.nativeSessionId, ctx.executionMode)
      : null;

    return collectProviderUsageTelemetry({
      provider: "claude-code",
      model: ctx.model,
      prompt: ctx.prompt,
      cwd: ctx.cwd,
      stdout: ctx.stdout,
      stderr: ctx.stderr,
      capturedText: ctx.capturedText,
      nativeSessionId: ctx.nativeSessionId,
      claudeSessionJsonl,
      startTimeMs: ctx.startedMs,
      executionMode: ctx.executionMode,
    });
  }

  private async readClaudeSessionJsonl(
    dockerRunner: IDockerRunner,
    cwd: string,
    nativeSessionId: string,
    executionMode: CliWorkflowSettings["executionMode"],
  ): Promise<string | null> {
    if (executionMode !== "DOCKER") {
      return null;
    }

    const sessionPath = pathPosix.join(
      CONTAINER_RUNTIME_HOME,
      ".claude",
      "projects",
      CONTAINER_WORKSPACE_ROOT.replaceAll(pathPosix.sep, "-"),
      `${nativeSessionId}.jsonl`,
    );
    return (await dockerRunner.readWorkspaceFile?.(cwd, sessionPath).catch(() => null)) || null;
  }
}

class CodexLogHandler implements IProviderLogHandler {
  async getTelemetry(ctx: LogHandlerContext): Promise<ProviderUsageTelemetry> {
    const codexSessionJson = await this.readCodexLatestSessionJson(ctx.dockerRunner, ctx.cwd, ctx.executionMode);

    return collectProviderUsageTelemetry({
      provider: "codex",
      model: ctx.model,
      prompt: ctx.prompt,
      cwd: ctx.cwd,
      stdout: ctx.stdout,
      stderr: ctx.stderr,
      capturedText: ctx.capturedText,
      nativeSessionId: ctx.nativeSessionId,
      codexSessionJson,
      startTimeMs: ctx.startedMs,
      executionMode: ctx.executionMode,
    });
  }

  private async readCodexLatestSessionJson(
    dockerRunner: IDockerRunner,
    cwd: string,
    executionMode: CliWorkflowSettings["executionMode"],
  ): Promise<string | null> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");

    if (executionMode === "DOCKER") {
      const sessionsDir = pathPosix.join(
        CONTAINER_RUNTIME_HOME,
        ".codex",
        "sessions",
        year,
        month,
        day,
      );
      return (await dockerRunner.readLatestWorkspaceFile?.(cwd, sessionsDir, "*.jsonl").catch(() => null)) ?? null;
    }

    const sessionsDir = path.join(os.homedir(), ".codex", "sessions", year, month, day);
    try {
      const files = await fs.readdir(sessionsDir);
      // Codex writes rollout transcripts as `rollout-<ts>-<uuid>.jsonl`.
      const jsonFiles = files.filter(f => f.endsWith(".jsonl"));
      if (jsonFiles.length === 0) return null;
      const withMtimes = await Promise.all(
        jsonFiles.map(async (f) => {
          const filePath = path.join(sessionsDir, f);
          const stat = await fs.stat(filePath).catch(() => null);
          return { filePath, mtime: stat?.mtimeMs ?? 0 };
        }),
      );
      withMtimes.sort((a, b) => b.mtime - a.mtime);
      return await fs.readFile(withMtimes[0].filePath, "utf8").catch(() => null);
    } catch {
      return null;
    }
  }
}

class QwenLogHandler implements IProviderLogHandler {
  async getTelemetry(ctx: LogHandlerContext): Promise<ProviderUsageTelemetry> {
    const qwenLog = await this.readQwenLogData(ctx.dockerRunner, ctx.cwd, ctx.executionMode, ctx.sessionId, ctx.startedMs);
    return collectProviderUsageTelemetry({
      provider: "qwen-code",
      model: ctx.model,
      prompt: ctx.prompt,
      cwd: ctx.cwd,
      stdout: ctx.stdout,
      stderr: ctx.stderr,
      capturedText: ctx.capturedText,
      nativeSessionId: ctx.nativeSessionId,
      qwenReportedUsage: qwenLog?.usage ?? null,
      qwenConversation: qwenLog?.conversation ?? null,
      startTimeMs: ctx.startedMs,
      executionMode: ctx.executionMode,
    });
  }

  private resolveQwenHostLogDir(sessionId: string): string {
    const safeSession = (sessionId || "session").replace(/[^A-Za-z0-9_-]/g, "_");
    return path.join(os.tmpdir(), "code-ux-qwen-openai-logs", safeSession);
  }

  private async readQwenLogData(
    dockerRunner: IDockerRunner,
    cwd: string,
    executionMode: CliWorkflowSettings["executionMode"],
    sessionId: string,
    startTimeMs: number,
  ): Promise<{ usage: QwenUsageTotals | null; conversation: ParsedConversationTurn[] } | null> {
    let records: unknown[] = [];
    if (executionMode === "DOCKER") {
      const arrayJson = await dockerRunner.readWorkspaceJsonArray?.(cwd, CONTAINER_QWEN_OPENAI_LOG_DIR).catch(() => null);
      if (!arrayJson) return null;
      try {
        const parsed = JSON.parse(arrayJson);
        records = Array.isArray(parsed) ? parsed : [];
      } catch {
        return null;
      }
    } else {
      records = await readQwenOpenAiLogRecords(this.resolveQwenHostLogDir(sessionId), startTimeMs);
    }
    if (records.length === 0) {
      return null;
    }
    return { usage: sumQwenOpenAiUsage(records), conversation: buildQwenConversation(records) };
  }
}

class AntigravityLogHandler implements IProviderLogHandler {
  async getTelemetry(ctx: LogHandlerContext): Promise<ProviderUsageTelemetry> {
    const transcriptJsonl = ctx.nativeSessionId
      ? await this.readAntigravityTranscript(ctx.dockerRunner, ctx.cwd, ctx.nativeSessionId, ctx.executionMode)
      : null;

    return collectProviderUsageTelemetry({
      provider: "antigravity",
      model: ctx.model,
      prompt: ctx.prompt,
      cwd: ctx.cwd,
      stdout: ctx.stdout,
      stderr: ctx.stderr,
      capturedText: ctx.capturedText,
      nativeSessionId: ctx.nativeSessionId,
      startTimeMs: ctx.startedMs,
      executionMode: ctx.executionMode,
      antigravitySessionDbPath: ctx.tempDbPath || undefined,
      antigravityTranscriptJsonl: transcriptJsonl,
    });
  }

  private async readAntigravityTranscript(
    dockerRunner: IDockerRunner,
    cwd: string,
    conversationId: string,
    executionMode: CliWorkflowSettings["executionMode"],
  ): Promise<string | null> {
    const candidates = [
      executionMode === "DOCKER"
        ? pathPosix.join(CONTAINER_RUNTIME_HOME, ".gemini", "antigravity-cli", "brain", conversationId, ".system_generated", "logs", "transcript.jsonl")
        : path.join(os.homedir(), ".gemini", "antigravity-cli", "brain", conversationId, ".system_generated", "logs", "transcript.jsonl"),
      executionMode === "DOCKER"
        ? pathPosix.join(CONTAINER_RUNTIME_HOME, ".gemini", "antigravity-cli", "brain", conversationId, ".system_generated", "logs", "overview.txt")
        : path.join(os.homedir(), ".gemini", "antigravity-cli", "brain", conversationId, ".system_generated", "logs", "overview.txt"),
      executionMode === "DOCKER"
        ? pathPosix.join(CONTAINER_RUNTIME_HOME, ".gemini", "antigravity", "brain", conversationId, ".system_generated", "logs", "transcript.jsonl")
        : path.join(os.homedir(), ".gemini", "antigravity", "brain", conversationId, ".system_generated", "logs", "transcript.jsonl"),
      executionMode === "DOCKER"
        ? pathPosix.join(CONTAINER_RUNTIME_HOME, ".gemini", "antigravity", "brain", conversationId, ".system_generated", "logs", "overview.txt")
        : path.join(os.homedir(), ".gemini", "antigravity", "brain", conversationId, ".system_generated", "logs", "overview.txt"),
    ];

    for (const p of candidates) {
      const raw = executionMode === "DOCKER"
        ? await dockerRunner.readWorkspaceFile?.(cwd, p).catch(() => null)
        : await fs.readFile(p, "utf8").catch(() => null);
      if (raw) {
        return raw;
      }
    }
    return null;
  }
}
