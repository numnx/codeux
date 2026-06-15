import type { ThinkingMode, InvocationRoutingId } from "./execution-enums-types.js";
import type { InvocationRoutingSettings } from "./dashboard-settings-types.js";

export type ProviderId = "jules" | "gemini" | "codex" | "claude-code" | "qwen-code" | "opencode" | "antigravity";

export type ProviderConfigId = string;

export type ProviderStrategy = "MANUAL" | "WEIGHTED" | "AGENT";

export interface ProviderSettings {
  provider: ProviderId;
  name: string;
  enabled: boolean;
  model: string;
  weight: number;
  thinkingMode: ThinkingMode;
  apiKey: string;
  mountAuth: boolean;
  authPath: string;
  /** Custom API endpoint base URL for providers that support it (claude-code, codex). */
  customBaseUrl?: string;
  /** Custom model identifier sent to the CLI when routing through a custom base URL (claude-code, codex). */
  customModel?: string;
  maxConcurrentTasks: number;
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
}

export interface QwenModelProviderSettings {
  id: string;
  name: string;
  authType: "openai" | "anthropic" | "gemini";
  envKey: string;
  apiKey: string;
  baseUrl: string;
  description?: string;
}

export interface AiProviderSettings {
  provider: ProviderConfigId | null;
  strategy: ProviderStrategy;
  providers: Record<ProviderConfigId, ProviderSettings>;
  invocationRouting: Record<InvocationRoutingId, InvocationRoutingSettings>;
}

export type VirtualWorkerProvider = Exclude<ProviderId, "jules">;

export interface InvocationProviderOverrideSettings {
  enabled?: boolean;
  model?: string;
  weight?: number;
  thinkingMode?: ThinkingMode;
}
