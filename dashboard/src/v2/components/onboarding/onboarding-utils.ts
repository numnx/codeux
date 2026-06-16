import type { OnboardingProviderCredentialStatus, ProviderConfigId, ProviderId, ProjectSettings, SystemSettings, OnboardingRuntimeReadiness } from "../../../types.js";
import {
  createProjectProviderDraft,
  sortProviderConfigEntries,
} from "../../lib/settings-view-models.js";
import { Settings, Box, ShieldCheck, Cpu, GitBranch, ClipboardList, Layers, Sparkles, Monitor } from "lucide-preact";

export const CODEUX_REPO_URL = "https://github.com/codeux-ai/codeux";

export const LICENSE_TEXT = `MIT License

Copyright (c) 2026 Pierre Voss

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export type StepId = "installation" | "introduction" | "providers" | "provider-setup" | "git" | "jira" | "defaults" | "automation" | "appearance";

export const steps: Array<{ id: StepId; label: string; icon: typeof Settings }> = [
  { id: "installation", label: "Installation", icon: Box },
  { id: "introduction", label: "Introduction", icon: ShieldCheck },
  { id: "providers", label: "Select Providers", icon: Cpu },
  { id: "provider-setup", label: "Providers", icon: Settings },
  { id: "git", label: "Git", icon: GitBranch },
  { id: "jira", label: "Jira", icon: ClipboardList },
  { id: "defaults", label: "Default providers", icon: Layers },
  { id: "automation", label: "Automation", icon: Sparkles },
  { id: "appearance", label: "Appearance", icon: Monitor },
];

export const DEFAULT_JIRA_SETTINGS: SystemSettings["integrations"]["jira"] = {
  host: "",
  email: "",
  apiToken: "",
  autoCloseLinkedIssues: false,
  defaultProject: "",
  closeTransitionName: "Done",
};

export const providerMountFields: Partial<Record<ProviderId, keyof SystemSettings["defaults"]["cliWorkflow"]>> = {
  gemini: "containerMountGeminiAuth",
  codex: "containerMountCodexAuth",
  "claude-code": "containerMountClaudeCodeAuth",
  "qwen-code": "containerMountQwenCodeAuth",
  opencode: "containerMountOpenCodeAuth",
  antigravity: "containerMountAntigravityAuth",
};

export const providerLabels: Record<ProviderId, string> = {
  jules: "Jules",
  gemini: "Gemini",
  codex: "Codex",
  "claude-code": "Claude Code",
  "qwen-code": "Qwen Code",
  opencode: "OpenCode",
  antigravity: "Antigravity",
};

export const PROVIDER_TYPES: ProviderId[] = ["jules", "gemini", "antigravity", "codex", "claude-code", "qwen-code", "opencode"];

export const providerDescriptions: Record<ProviderId, string> = {
  jules: "Google Jules API service for agent session and workspace orchestration.",
  gemini: "Gemini CLI with local OAuth auth-copy or API-key based execution.",
  codex: "Codex CLI for OpenAI-powered local container execution.",
  "claude-code": "Claude Code CLI with local auth-copy or provider API key.",
  "qwen-code": "Qwen Code CLI with OAuth, Alibaba Coding Plan, or custom model provider config.",
  opencode: "OpenCode CLI with local auth, provider keys, or OpenAI-compatible endpoints.",
  antigravity: "Antigravity CLI (agy) for Google-powered local container execution.",
};

export const getProviderWatermark = (providerId: ProviderId): string => (
  providerId === "jules" ? "JLS"
    : providerId === "gemini" ? "GMN"
      : providerId === "codex" ? "CDX"
        : providerId === "qwen-code" ? "QWN"
          : providerId === "opencode" ? "OPC"
            : providerId === "antigravity" ? "AGY"
              : "CLD"
);

export const buildProviderConfigId = (providerId: ProviderId): ProviderConfigId => (
  `${providerId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` as ProviderConfigId
);

export const defaultReadiness: OnboardingRuntimeReadiness = {
  checkedAt: "",
  providers: [],
  dependencies: [],
  cluster: {
    status: "unknown" as any,
    label: "Unknown",
    detail: "Unknown",
  },
};

export const getProviderInitialSelection = (
  providers: OnboardingProviderCredentialStatus[],
  settings: SystemSettings,
): ProviderId[] => {
  const detected = providers
    .filter((provider) => provider.available || provider.mountEnabled)
    .map((provider) => provider.provider);
  const enabled = Object.values(settings.defaults.aiProvider.providers)
    .filter((provider) => provider.enabled)
    .map((provider) => provider.provider);
  return Array.from(new Set<ProviderId>(["jules", ...enabled, ...detected]));
};

export const cloneSettings = (settings: SystemSettings): SystemSettings => JSON.parse(JSON.stringify(settings)) as SystemSettings;

export const getSystemProvidersByType = (
  settings: SystemSettings | null,
  providerId: ProviderId,
): Array<[ProviderConfigId, SystemSettings["integrations"]["providers"][ProviderConfigId]]> => (
  sortProviderConfigEntries(Object.entries(settings?.integrations.providers || {})
    .filter(([, provider]) => provider.provider === providerId) as Array<[ProviderConfigId, SystemSettings["integrations"]["providers"][ProviderConfigId]]>)
);

export const getFirstCliProviderConfigId = (providers: ProjectSettings["aiProvider"]["providers"]): ProviderConfigId | null => (
  Object.entries(providers).find(([, provider]) => provider.provider !== "jules")?.[0] as ProviderConfigId || null
);

export const syncProjectProvidersToIntegrationCatalog = (
  settings: SystemSettings,
  nextIntegrationProviders: SystemSettings["integrations"]["providers"],
): ProjectSettings => {
  const nextProjectProviders = Object.fromEntries(
    Object.entries(nextIntegrationProviders).map(([providerConfigId, provider]) => [
      providerConfigId,
      settings.defaults.aiProvider.providers[providerConfigId]
        ? {
          ...settings.defaults.aiProvider.providers[providerConfigId],
          provider: provider.provider,
          name: provider.name,
        }
        : createProjectProviderDraft(provider.provider, provider.name),
    ]),
  ) as ProjectSettings["aiProvider"]["providers"];

  const nextInvocationRouting = Object.fromEntries(
    Object.entries(settings.defaults.aiProvider.invocationRouting).map(([routeId, route]) => [
      routeId,
      {
        ...route,
        provider: route.provider && nextProjectProviders[route.provider] ? route.provider : null,
        allowedProviders: route.allowedProviders.filter((providerConfigId) => nextProjectProviders[providerConfigId]),
        providers: Object.fromEntries(
          Object.entries(route.providers).filter(([providerConfigId]) => nextProjectProviders[providerConfigId]),
        ),
      },
    ]),
  ) as ProjectSettings["aiProvider"]["invocationRouting"];

  const fallbackGlobalProvider = settings.defaults.aiProvider.provider && nextProjectProviders[settings.defaults.aiProvider.provider]
    ? settings.defaults.aiProvider.provider
    : (Object.keys(nextProjectProviders)[0] as ProviderConfigId) || null;
  const fallbackWorkerProvider = nextProjectProviders[settings.defaults.workers.virtualWorkerProvider]
    ? settings.defaults.workers.virtualWorkerProvider
    : getFirstCliProviderConfigId(nextProjectProviders) || fallbackGlobalProvider || settings.defaults.workers.virtualWorkerProvider;

  return {
    ...settings.defaults,
    aiProvider: {
      ...settings.defaults.aiProvider,
      provider: fallbackGlobalProvider,
      providers: nextProjectProviders,
      invocationRouting: nextInvocationRouting,
    },
    workers: {
      ...settings.defaults.workers,
      virtualWorkerProvider: fallbackWorkerProvider,
    },
  };
};

export const platform = (typeof window !== "undefined" && (window as any).codeUxDesktop?.platform) || "linux";

export const getOSInfo = (plat: string) => {
  const isMac = plat === "darwin";
  const isWindows = plat === "win32";

  let osLabel = "Linux";
  if (isMac) osLabel = "macOS";
  if (isWindows) osLabel = "Windows";

  const dockerDesktopLink = isMac
    ? "https://docs.docker.com/desktop/install/mac-install/"
    : isWindows
    ? "https://docs.docker.com/desktop/install/windows-install/"
    : "https://docs.docker.com/desktop/install/linux-install/";

  const dockerDownloadLink = isMac
    ? "https://www.docker.com/products/docker-desktop/"
    : isWindows
    ? "https://www.docker.com/products/docker-desktop/"
    : "https://docs.docker.com/engine/install/";

  const gitLink = isMac
    ? "https://git-scm.com/download/mac"
    : isWindows
    ? "https://git-scm.com/download/win"
    : "https://git-scm.com/download/linux";

  const gitInstruction = isMac
    ? "Install via Homebrew: brew install git"
    : isWindows
    ? "Run the Git for Windows installer."
    : "Install via apt or dnf: sudo apt install git";

  return {
    osLabel,
    dockerDesktopLink,
    dockerDownloadLink,
    gitLink,
    gitInstruction,
  };
};
