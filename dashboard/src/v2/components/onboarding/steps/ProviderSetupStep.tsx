import type { FunctionComponent } from "preact";
import { Plus } from "lucide-preact";
import type { ProviderId, ProviderConfigId, OnboardingProviderCredentialStatus, SystemSettings } from "../../../../types.js";
import { ProviderBrandIcon } from "../../providers/ProviderBrandIcon.js";
import { ProviderInstanceCard } from "../../settings/ProviderInstanceCard.js";
import { providerLabels, providerDescriptions, getProviderWatermark, getSystemProvidersByType } from "../onboarding-utils.js";

interface ProviderSetupStepProps {
  selectedProviderTypes: ProviderId[];
  settings: SystemSettings | null;
  readinessByProvider: Partial<Record<ProviderId, OnboardingProviderCredentialStatus>>;
  addProviderInstance: (providerId: ProviderId) => void;
  configureProviderInstance: (providerConfigId: ProviderConfigId, updates: Partial<SystemSettings["integrations"]["providers"][ProviderConfigId]>) => void;
  removeProviderInstance: (providerConfigId: ProviderConfigId) => void;
  configureProjectProvider: (providerConfigId: ProviderConfigId, updates: { enabled: boolean }) => void;
  dockerExecutionEnabled: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  saving?: boolean;
}

export const ProviderSetupStep: FunctionComponent<ProviderSetupStepProps> = ({
  selectedProviderTypes,
  settings,
  readinessByProvider,
  addProviderInstance,
  configureProviderInstance,
  removeProviderInstance,
  configureProjectProvider,
  dockerExecutionEnabled,
  onNext,
  onPrev,
  saving,
}) => {
  if (!settings) return null;
  return (
    <div className="space-y-4">
      {selectedProviderTypes.length === 0 ? (
        <div data-onboarding-card className="rounded-3xl border border-black/[0.06] bg-white/75 p-6 text-sm text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.04]">
          No providers selected. You can add provider credentials later in Settings.
        </div>
      ) : selectedProviderTypes.map((providerId) => {
        const providerEntries = getSystemProvidersByType(settings, providerId);
        const readinessStatus = readinessByProvider[providerId];
        return (
          <div data-onboarding-card key={providerId} className="relative overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white/78 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)] dark:border-white/[0.06] dark:bg-white/[0.04]">
            <div aria-hidden className="pointer-events-none absolute -right-6 -top-8 font-display text-[7rem] font-black leading-none tracking-tight text-black/[0.025] dark:text-white/[0.025]">
              {getProviderWatermark(providerId)}
            </div>
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] pb-4 dark:border-white/[0.06]">
              <div className="flex min-w-0 items-start gap-3">
                <ProviderBrandIcon id={providerId} />
                <div className="min-w-0">
                  <div className="text-base font-black text-slate-900 dark:text-white">{providerLabels[providerId]}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {readinessStatus?.detectedFiles.length ? `Detected: ${readinessStatus.detectedFiles.join(", ")}` : (providerDescriptions as any)[providerId]}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => addProviderInstance(providerId)}
                className="inline-flex items-center gap-2 rounded-2xl border border-signal-500/20 bg-signal-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-signal-700 hover:bg-signal-500/15 dark:text-signal-200"
              >
                <Plus className="h-3.5 w-3.5" />
                Add instance
              </button>
            </div>

            <div className="relative z-10 mt-4 space-y-3">
              {providerEntries.length === 0 ? (
                <div className="rounded-2xl border border-ember-500/20 bg-ember-500/10 p-4 text-sm text-ember-700 dark:text-ember-300">
                  Add an instance to configure {providerLabels[providerId]} credentials.
                </div>
              ) : providerEntries.map(([providerConfigId, integrationProvider], index) => {
                const projectProvider = settings?.defaults.aiProvider.providers[providerConfigId];
                const providerModel = projectProvider?.model
                  || (integrationProvider.provider === "opencode" ? "anthropic/claude-sonnet-4-5" : "qwen3-coder-plus");
                return (
                  <ProviderInstanceCard
                    key={providerConfigId}
                    providerConfigId={providerConfigId}
                    provider={integrationProvider as any}
                    providerModel={providerModel}
                    dockerExecutionEnabled={dockerExecutionEnabled}
                    onUpdate={(updates: any) => configureProviderInstance(providerConfigId, updates)}
                    onRemove={providerEntries.length > 1 ? () => removeProviderInstance(providerConfigId) : undefined}
                    enabled={(projectProvider as any)?.enabled ?? true}
                    onToggleEnabled={(value) => configureProjectProvider(providerConfigId, { enabled: value } as any)}
                    index={index}
                    total={providerEntries.length}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
