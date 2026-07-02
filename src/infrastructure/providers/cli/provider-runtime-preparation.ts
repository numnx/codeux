import * as os from "os";
import { randomUUID } from "crypto";
import type { CliWorkflowSettings } from "../../../contracts/app-types.js";
import type { ProviderId } from "../../../contracts/app-types.js";
import type { ProviderRunInput } from "./provider-runner.js";
import type { CliProviderId } from "./provider-command-specs.js";
import type { CustomMcpServer, QwenModelProviderSettings } from "../../../contracts/app-types.js";
import type { McpConnectionInfo } from "../../../contracts/mcp-connection-types.js";
import { isOpenCodeNativeSessionId } from "./provider-command-specs.js";
import {
  CONTAINER_QWEN_OPENAI_LOG_DIR,
  resolveQwenHostLogDir,
  resolveAntigravityHostLogPath,
  resolveAntigravityContainerLogPath
} from "./provider-runtime-artifacts.js";
import { buildQwenRuntimeConfig, buildOpenCodeRuntimeConfig } from "./provider-runtime-config.js";

export interface ProviderRuntimePreparationInput {
  provider: CliProviderId;
  model: string;
  apiKey: string;
  sessionId: string;
  workflowSettings: CliWorkflowSettings;
  githubToken?: string;
  gitlabToken?: string;
  providerMountAuth?: boolean;
  continueSessionId?: string | null;
  qwenAuthMode?: "LOCAL_AUTH" | "ALIBABA_CODING_PLAN" | "MODEL_PROVIDER";
  qwenRegion?: "china" | "international";
  qwenBaseUrl?: string;
  qwenEnvKey?: string;
  qwenModelId?: string;
  qwenProtocol?: "openai" | "anthropic" | "gemini";
  qwenAdditionalModelProviders?: QwenModelProviderSettings[];
  openCodeAuthMode?: "LOCAL_AUTH" | "ENV_KEY" | "CUSTOM_PROVIDER";
  openCodeProviderId?: string;
  openCodeModelId?: string;
  openCodeBaseUrl?: string;
  openCodeEnvKey?: string;
  openCodePackage?: string;
  providerAuthPath?: string;
  customBaseUrl?: string;
  customModel?: string;
  mcpConnection?: McpConnectionInfo | null;
  customMcpServers?: CustomMcpServer[];
}

export interface PreparedProviderRuntime {
  runModel: string;
  qwenProcessLogDir?: string;
  antigravityLogPath: string | null;
  providerEnv: NodeJS.ProcessEnv;
  nativeSessionId: string | null;
}

export function prepareProviderRuntime(input: ProviderRuntimePreparationInput): PreparedProviderRuntime {
  const runModel = input.model;

  const qwenProcessLogDir = input.provider === "qwen-code"
    ? (input.workflowSettings.executionMode === "DOCKER"
      ? CONTAINER_QWEN_OPENAI_LOG_DIR
      : resolveQwenHostLogDir(input.sessionId))
    : undefined;

  const antigravityLogPath = input.provider === "antigravity"
    ? (input.workflowSettings.executionMode === "DOCKER"
      ? resolveAntigravityContainerLogPath(input.sessionId)
      : resolveAntigravityHostLogPath(input.sessionId))
    : null;

  const providerEnv = withProviderEnv(
    input.provider,
    runModel,
    input.apiKey,
    input.workflowSettings,
    input.githubToken,
    input.providerMountAuth,
    input as any,
    qwenProcessLogDir,
    input.gitlabToken
  );

  const nativeSessionId = input.provider === "opencode"
    ? isOpenCodeNativeSessionId(input.continueSessionId) ? input.continueSessionId! : null
    : input.provider === "qwen-code"
      ? null
    : input.continueSessionId || (input.provider === "claude-code" ? randomUUID() : null);

  return {
    runModel,
    qwenProcessLogDir,
    antigravityLogPath,
    providerEnv,
    nativeSessionId
  };
}

export function withProviderEnv(
    provider: ProviderId,
    model: string,
    apiKey: string,
    workflowSettings: CliWorkflowSettings,
    githubToken?: string,
    providerMountAuth?: boolean,
    providerConfig?: Pick<ProviderRunInput, "qwenAuthMode" | "qwenRegion" | "qwenBaseUrl" | "qwenEnvKey" | "qwenModelId" | "qwenProtocol" | "qwenAdditionalModelProviders" | "openCodeAuthMode" | "openCodeProviderId" | "openCodeModelId" | "openCodeBaseUrl" | "openCodeEnvKey" | "openCodePackage" | "mcpConnection" | "customBaseUrl" | "customModel" | "customMcpServers">,
    qwenProcessLogDir?: string,
    gitlabToken?: string,
  ): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    const useContainerMounts = workflowSettings.executionMode === "DOCKER";
    const useGithubMount = useContainerMounts && workflowSettings.containerMountGithubAuth;
    const useProviderMount = useContainerMounts && Boolean(providerMountAuth);
    const isApiKeyMode = !providerMountAuth;

    if (githubToken && !useGithubMount) {
      env.GH_TOKEN = githubToken;
      env.GITHUB_TOKEN = githubToken;
    }
    if (gitlabToken) {
      env.GITLAB_TOKEN = gitlabToken;
      env.GLAB_TOKEN = gitlabToken;
    }
    if (provider === "gemini") {
      if (model && model !== "default") env.GEMINI_MODEL = model;
      if (isApiKeyMode && apiKey && !useProviderMount) env.GEMINI_API_KEY = apiKey;
      env.GEMINI_CLI_TRUST_WORKSPACE = "true";
    } else if (provider === "claude-code") {
      if (isApiKeyMode && providerConfig?.customBaseUrl) {
        // Claude Code speaks the Anthropic Messages API and always appends `/v1/messages`
        // to ANTHROPIC_BASE_URL. A base ending in `/v1` (e.g. the OpenAI-format URL used by
        // Codex/Qwen, https://openrouter.ai/api/v1) would produce `/v1/v1/messages` and fail
        // auth, so normalize it off — the Anthropic-compatible base is e.g. .../api.
        const normalizedBaseUrl = providerConfig.customBaseUrl.trim().replace(/\/v1\/?$/, "");
        env.ANTHROPIC_BASE_URL = rewriteLoopbackUrlForDocker(
          normalizedBaseUrl,
          shouldRewriteDockerLoopbackUrls(workflowSettings),
        );
        // Gateways (OpenRouter, LiteLLM, etc.) authenticate with `Authorization: Bearer`,
        // which Claude Code only sends via ANTHROPIC_AUTH_TOKEN. ANTHROPIC_API_KEY would be
        // sent as an `x-api-key` header the gateway rejects, so route the key to the Bearer
        // token and clear the api key to avoid credential conflicts. Mirrors the OpenRouter
        // Claude Code integration guidance.
        if (apiKey && !useProviderMount) {
          env.ANTHROPIC_AUTH_TOKEN = apiKey;
          env.ANTHROPIC_API_KEY = "";
        }
      } else if (isApiKeyMode && apiKey && !useProviderMount) {
        env.ANTHROPIC_API_KEY = apiKey;
      }

      // If a custom model is provided (and thus passed in `model`), point every Claude
      // Code model tier at it — including the background "small/fast" tier that would
      // otherwise request a Haiku model the gateway does not serve.
      if (isApiKeyMode && model && model !== "default") {
        env.ANTHROPIC_MODEL = model;
        env.ANTHROPIC_SMALL_FAST_MODEL = model;
        env.ANTHROPIC_DEFAULT_OPUS_MODEL = model;
        env.ANTHROPIC_DEFAULT_SONNET_MODEL = model;
        env.ANTHROPIC_DEFAULT_HAIKU_MODEL = model;
      }
    } else if (provider === "codex") {
      if (model && model !== "default") env.CODEX_MODEL = model;
      if (isApiKeyMode && apiKey && !useProviderMount) env.OPENAI_API_KEY = apiKey;
      if (isApiKeyMode && providerConfig?.customBaseUrl) {
        env.OPENAI_BASE_URL = rewriteLoopbackUrlForDocker(
          providerConfig.customBaseUrl,
          shouldRewriteDockerLoopbackUrls(workflowSettings),
        );
      }
    } else if (provider === "qwen-code") {
      const qwenEnvKeys = new Set<string>();
      const primaryEnvKey = !isApiKeyMode
        ? "OLLAMA_API_KEY"
        : providerConfig?.qwenAuthMode === "ALIBABA_CODING_PLAN"
          ? "BAILIAN_CODING_PLAN_API_KEY"
          : providerConfig?.qwenEnvKey || "OLLAMA_API_KEY";
      qwenEnvKeys.add(primaryEnvKey);
      qwenEnvKeys.add("QWEN_CODE_SUPPRESS_YOLO_WARNING");
      env.QWEN_CODE_SUPPRESS_YOLO_WARNING = "1";
      if (isApiKeyMode && apiKey && !useProviderMount) {
        env[primaryEnvKey] = apiKey;
        env.DASHSCOPE_API_KEY ||= apiKey;
        env.BAILIAN_CODING_PLAN_API_KEY ||= apiKey;
        env.QWEN_API_KEY ||= apiKey;
        if ((providerConfig?.qwenProtocol || "openai") === "openai") {
          env.OPENAI_API_KEY ||= apiKey;
        }
      }
      const baseUrl = isApiKeyMode && providerConfig?.qwenAuthMode === "ALIBABA_CODING_PLAN"
        ? providerConfig.qwenRegion === "china"
          ? "https://coding.dashscope.aliyuncs.com/v1"
          : "https://coding-intl.dashscope.aliyuncs.com/v1"
        : isApiKeyMode && providerConfig?.qwenAuthMode === "MODEL_PROVIDER"
          ? providerConfig.qwenBaseUrl || "http://127.0.0.1:11434/v1"
          : undefined;
      if (baseUrl) {
        env.OPENAI_BASE_URL = rewriteLoopbackUrlForDocker(baseUrl, shouldRewriteDockerLoopbackUrls(workflowSettings));
      }
      if (isApiKeyMode) {
        for (const entry of providerConfig?.qwenAdditionalModelProviders || []) {
          if (entry.envKey) {
            qwenEnvKeys.add(entry.envKey);
            if (entry.apiKey && !useProviderMount) {
              env[entry.envKey] = entry.apiKey;
            }
          }
        }
      }
      if (qwenEnvKeys.size > 0) {
        env.CODE_UX_PROVIDER_ENV_KEYS = [...qwenEnvKeys].join(",");
      }
      env.QWEN_SETTINGS_CONTENT = buildQwenRuntimeConfig(
        model,
        {
          ...providerConfig,
          qwenAuthMode: !isApiKeyMode ? "LOCAL_AUTH" : providerConfig?.qwenAuthMode,
        },
        providerConfig?.mcpConnection || null,
        shouldRewriteDockerLoopbackUrls(workflowSettings),
        (url, enabled) => rewriteLoopbackUrlForDocker(url, enabled),
        qwenProcessLogDir,
      );
    } else if (provider === "opencode") {
      const envKey = isApiKeyMode
        ? (providerConfig?.openCodeEnvKey || (providerConfig?.openCodeAuthMode === "CUSTOM_PROVIDER" ? "OLLAMA_API_KEY" : "ANTHROPIC_API_KEY"))
        : "ANTHROPIC_API_KEY";
      const resolvedApiKey = isApiKeyMode ? (apiKey || process.env[envKey] || "") : "";
      if (resolvedApiKey && !useProviderMount) {
        env[envKey] = resolvedApiKey;
        env.OPENCODE_API_KEY = resolvedApiKey;
        if ((providerConfig?.openCodeProviderId || model.split("/")[0]) === "anthropic") {
          env.ANTHROPIC_API_KEY ||= resolvedApiKey;
        }
        if ((providerConfig?.openCodeProviderId || model.split("/")[0]) === "openai") {
          env.OPENAI_API_KEY ||= resolvedApiKey;
        }
        if ((providerConfig?.openCodeProviderId || model.split("/")[0]) === "github-copilot") {
          env.GITHUB_TOKEN ||= resolvedApiKey;
        }
      }
      env.OPENCODE_CONFIG_CONTENT = buildOpenCodeRuntimeConfig(
        model,
        {
          ...providerConfig,
          openCodeAuthMode: !isApiKeyMode ? "LOCAL_AUTH" : providerConfig?.openCodeAuthMode,
        },
        providerConfig?.mcpConnection || null,
        shouldRewriteDockerLoopbackUrls(workflowSettings),
        (url, enabled) => rewriteLoopbackUrlForDocker(url, enabled),
      );
    } else if (provider === "antigravity") {
      if (isApiKeyMode && apiKey && !useProviderMount) {
        env.ANTIGRAVITY_API_KEY = apiKey;
      }
      if (model && model !== "default") {
        env.ANTIGRAVITY_MODEL = model;
        env.AGY_MODEL = model;
      }
    }
    return env;
  }

export function shouldRewriteDockerLoopbackUrls(workflowSettings: CliWorkflowSettings): boolean {
    if (workflowSettings.executionMode !== "DOCKER") {
      return false;
    }
    const override = process.env.CODE_UX_DOCKER_REWRITE_LOCALHOST;
    if (override === "0" || override === "false") {
      return false;
    }
    if (override === "1" || override === "true") {
      return true;
    }
    return process.platform === "darwin"
      || process.platform === "win32"
      || os.release().toLowerCase().includes("microsoft");
  }

export function rewriteLoopbackUrlForDocker(rawUrl: string, enabled: boolean): string {
    if (!enabled) {
      return rawUrl;
    }
    try {
      const url = new URL(rawUrl);
      if (url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "::1") {
        url.hostname = "host.docker.internal";
        return url.toString();
      }
    } catch {
      return rawUrl;
    }
    return rawUrl;
  }
