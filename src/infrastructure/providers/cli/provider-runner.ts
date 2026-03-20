import { CliWorkflowSettings, ProviderId } from "../../../contracts/app-types.js";
import { CommandResult, runStreamingCommand } from "../../../services/cli-process-runner.js";
import { IDockerRunner } from "./docker-runner.js";
import { isDockerWorkspaceMountError } from "../../../services/cli-docker-utils.js";
import * as fs from "fs/promises";
import * as path from "path";
import { getRepoSprintOsPath } from "../../../shared/config/sprint-os-paths.js";

export type ProviderCommandSpec = (model: string, prompt: string) => { command: string; args: string[] };

export const providerSpecs: Record<Extract<ProviderId, "gemini" | "codex" | "claude-code">, ProviderCommandSpec> = {
  "gemini": (model: string, prompt: string) => ({
    command: "gemini",
    args: ["--yolo", "--p", prompt]
  }),
  "claude-code": (model: string, prompt: string) => {
    const args = ["--dangerously-skip-permissions"];
    if (model && model !== "default") args.push("--model", model);
    args.push("-p", prompt);
    return { command: "claude", args };
  },
  "codex": (model: string, prompt: string) => {
    const args = ["exec", "--yolo", "--output-last-message", "/tmp/codex-last-message.txt"];
    if (model && model !== "default") args.push("--model", model);
    args.push(prompt);
    return { command: "codex", args };
  }
};

export interface IProviderRunner {
  runProvider(input: {
    provider: Extract<ProviderId, "gemini" | "codex" | "claude-code">;
    prompt: string;
    cwd: string;
    model: string;
    fallbackModel?: string;
    apiKey: string;
    sessionId: string;
    workflowSettings: CliWorkflowSettings;
    repoPath: string;
    githubToken?: string;
    signal?: AbortSignal;
    onActivity: (desc: string, originator?: string) => void;
  }): Promise<CommandResult>;
  runProviderForText(input: {
    provider: Extract<ProviderId, "gemini" | "codex" | "claude-code">;
    prompt: string;
    cwd: string;
    model: string;
    fallbackModel?: string;
    apiKey: string;
    sessionId: string;
    workflowSettings: CliWorkflowSettings;
    repoPath: string;
    githubToken?: string;
    signal?: AbortSignal;
    onActivity: (desc: string, originator?: string) => void;
  }): Promise<CommandResult & { text: string }>;
}

export class ProviderRunner implements IProviderRunner {
  constructor(private readonly dockerRunner: IDockerRunner) { }

  async runProvider(input: {
    provider: Extract<ProviderId, "gemini" | "codex" | "claude-code">;
    prompt: string;
    cwd: string;
    model: string;
    fallbackModel?: string;
    apiKey: string;
    sessionId: string;
    workflowSettings: CliWorkflowSettings;
    repoPath: string;
    githubToken?: string;
    signal?: AbortSignal;
    onActivity: (desc: string, originator?: string) => void;
  }): Promise<CommandResult> {
    return await this.runProviderInternal(input);
  }

  async runProviderForText(input: {
    provider: Extract<ProviderId, "gemini" | "codex" | "claude-code">;
    prompt: string;
    cwd: string;
    model: string;
    fallbackModel?: string;
    apiKey: string;
    sessionId: string;
    workflowSettings: CliWorkflowSettings;
    repoPath: string;
    githubToken?: string;
    signal?: AbortSignal;
    onActivity: (desc: string, originator?: string) => void;
  }): Promise<CommandResult & { text: string }> {
    const outputPath = input.provider === "codex"
      ? path.join(getRepoSprintOsPath(input.repoPath, "tmp"), `provider-last-message-${input.sessionId}.txt`)
      : null;

    if (outputPath) {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
    }

    try {
      const result = await this.runProviderInternal({
        ...input,
        codexOutputPath: outputPath,
      });

      const capturedText = outputPath
        ? (await fs.readFile(outputPath, "utf8").catch(() => "")).trim()
        : "";

      return {
        ...result,
        text: capturedText || result.stdout || result.stderr,
      };
    } finally {
      if (outputPath) {
        await fs.rm(outputPath, { force: true }).catch(() => undefined);
      }
    }
  }

  private async runProviderInternal(input: {
    provider: Extract<ProviderId, "gemini" | "codex" | "claude-code">;
    prompt: string;
    cwd: string;
    model: string;
    fallbackModel?: string;
    apiKey: string;
    sessionId: string;
    workflowSettings: CliWorkflowSettings;
    repoPath: string;
    githubToken?: string;
    signal?: AbortSignal;
    onActivity: (desc: string, originator?: string) => void;
    codexOutputPath?: string | null;
  }): Promise<CommandResult> {
    const { provider, prompt, cwd, model, fallbackModel, apiKey, sessionId, workflowSettings, repoPath, githubToken, signal, onActivity } = input;
    let activeModel = this.normalizeModel(model);
    const requestedFallbackModel = typeof fallbackModel === "string" ? this.normalizeModel(fallbackModel) : null;
    const retryFallbackModel = requestedFallbackModel || (activeModel !== "default" ? "default" : null);

    const runCmd = async (modelToUse: string) => {
      const providerEnv = this.withProviderEnv(provider, modelToUse, apiKey, workflowSettings, githubToken);
      const spec = this.buildCommandSpec(provider, modelToUse, prompt, input.codexOutputPath);
      const { command, args } = spec;
      if (workflowSettings.executionMode === "DOCKER") {
        const result = await this.dockerRunner.runProviderInDocker({
          command, args, cwd, providerEnv, sessionId,
          providerLabel: provider, workflowSettings, repoPath, signal, onActivity
        });
        if (!result.ok && isDockerWorkspaceMountError(result)) {
          try { await fs.access(cwd); onActivity(`Docker could not mount workspace path (${cwd}) even though it exists locally. Path visibility mismatch.`); } catch { /* ignore */ }
        }
        return result;
      }
      return await runStreamingCommand(command, args, cwd, providerEnv, {
        signal,
        onStdoutLine: (line) => onActivity(line, "agent"),
        onStderrLine: (line) => onActivity(`[${provider}] ${line}`, "provider"),
      });
    };

    let result = await runCmd(activeModel);
    if (
      !result.ok
      && retryFallbackModel
      && activeModel !== retryFallbackModel
      && this.isModelUnavailableError(result)
    ) {
      onActivity(`Model "${activeModel}" is unavailable for ${provider}. Retrying with "${retryFallbackModel}".`);
      activeModel = retryFallbackModel;
      result = await runCmd(activeModel);
    }

    if (!result.ok && provider === "codex" && this.isTransientCodexTransportError(result)) {
      onActivity("Codex transport disconnected. Retrying once automatically...");
      await new Promise(r => setTimeout(r, 1500));
      result = await runCmd(activeModel);
    }
    return result;
  }

  private buildCommandSpec(
    provider: Extract<ProviderId, "gemini" | "codex" | "claude-code">,
    model: string,
    prompt: string,
    codexOutputPath?: string | null,
  ): { command: string; args: string[] } {
    if (provider === "codex" && codexOutputPath) {
      const args = ["exec", "--yolo", "--output-last-message", codexOutputPath];
      if (model && model !== "default") {
        args.push("--model", model);
      }
      args.push(prompt);
      return { command: "codex", args };
    }

    return providerSpecs[provider](model, prompt);
  }

  private withProviderEnv(
    provider: ProviderId,
    model: string,
    apiKey: string,
    workflowSettings: CliWorkflowSettings,
    githubToken?: string
  ): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    const useContainerMounts = workflowSettings.executionMode === "DOCKER";
    const useGithubMount = useContainerMounts && workflowSettings.containerMountGithubAuth;
    const useProviderMount = useContainerMounts
      && ((provider === "gemini" && workflowSettings.containerMountGeminiAuth)
        || (provider === "claude-code" && workflowSettings.containerMountClaudeCodeAuth)
        || (provider === "codex" && workflowSettings.containerMountCodexAuth));

    if (githubToken && !useGithubMount) {
      env.GH_TOKEN = githubToken;
      env.GITHUB_TOKEN = githubToken;
    }
    if (provider === "gemini") {
      if (model && model !== "default") env.GEMINI_MODEL = model;
      if (apiKey && !useProviderMount) env.GEMINI_API_KEY = apiKey;
    } else if (provider === "claude-code") {
      if (apiKey && !useProviderMount) env.ANTHROPIC_API_KEY = apiKey;
    } else if (provider === "codex") {
      if (model && model !== "default") env.CODEX_MODEL = model;
      if (apiKey && !useProviderMount) env.OPENAI_API_KEY = apiKey;
    }
    return env;
  }

  private normalizeModel(model: string): string {
    const trimmed = model.trim();
    return trimmed.length > 0 ? trimmed : "default";
  }

  private isModelUnavailableError(result: CommandResult): boolean {
    const text = `${result.stdout}\n${result.stderr}`.toLowerCase();
    return [
      /unknown model/.test(text),
      /unsupported model/.test(text),
      /model .* not found/.test(text),
      /model .* does not exist/.test(text),
      /model .* unavailable/.test(text),
      /invalid model/.test(text),
      /not a valid model/.test(text),
    ].some(Boolean);
  }

  private isTransientCodexTransportError(result: CommandResult): boolean {
    const text = `${result.stdout}\n${result.stderr}`.toLowerCase();
    return text.includes("stream disconnected before completion") || text.includes("error sending request for url") || text.includes("channel closed");
  }
}
