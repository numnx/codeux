import type { FunctionComponent } from "preact";
import { Layers } from "lucide-preact";
import type { SystemSettings, ProviderConfigId } from "../../../../types.js";
import { ProviderBrandIcon } from "../../providers/ProviderBrandIcon.js";
import { Row, SelectInput } from "../../settings/SettingsFormFields.js";
import { SectionCard } from "../../settings/panels/SharedPanelComponents.js";
import { getProviderTypeLabel } from "../../../lib/settings-view-models.js";

interface DefaultProvidersStepProps {
  settings: SystemSettings | null;
  updateSettings: (recipe: (current: SystemSettings) => SystemSettings) => void;
  enabledProviderInstances: Array<[ProviderConfigId, SystemSettings["integrations"]["providers"][ProviderConfigId]]>;
  providerInstanceOptions: Array<{ value: string; label: string }>;
  workerInstanceOptions: Array<{ value: string; label: string }>;
  onNext?: () => void;
  onPrev?: () => void;
  saving?: boolean;
}

export const DefaultProvidersStep: FunctionComponent<DefaultProvidersStepProps> = ({
  settings,
  updateSettings,
  enabledProviderInstances,
  providerInstanceOptions,
  workerInstanceOptions,
  onNext,
  onPrev,
  saving,
}) => {
  if (!settings) return null;
  return (
    <div className="space-y-4">
      <div data-onboarding-card className="rounded-3xl border border-black/[0.06] bg-white/70 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
        <div className="flex items-start gap-3">
          <Layers className="mt-0.5 h-5 w-5 shrink-0 text-signal-600 dark:text-signal-300" />
          <div>
            <div className="text-base font-black text-slate-900 dark:text-white">Pick your default providers</div>
            <div className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Choose which configured instance answers by default, and which one virtual workers run inside containers. You can fine-tune per-route routing later on the AI Models page.
            </div>
          </div>
        </div>
      </div>
      {enabledProviderInstances.length === 0 ? (
        <div data-onboarding-card className="rounded-3xl border border-ember-500/20 bg-ember-500/10 p-6 text-sm text-ember-700 dark:text-ember-300">
          No enabled providers yet. Go back to the Select Providers and Providers steps to enable at least one instance.
        </div>
      ) : (
        <>
          <div data-onboarding-card>
            <SectionCard title="Default routing" watermark="DEF" icon={<Layers strokeWidth={2.4} />}>
              <Row label="Default AI provider" description="The instance used when a route has no explicit override.">
                <SelectInput
                  value={settings.defaults.aiProvider.provider || ""}
                  onChange={(value) => updateSettings((current) => ({
                    ...current,
                    defaults: {
                      ...current.defaults,
                      aiProvider: { ...current.defaults.aiProvider, provider: value as ProviderConfigId },
                    },
                  }))}
                  options={providerInstanceOptions}
                  aria-label="Default AI provider"
                />
              </Row>
              <Row label="Virtual worker provider" description="The CLI instance dispatched inside Docker containers to execute tasks." last>
                <SelectInput
                  value={settings.defaults.workers.virtualWorkerProvider || ""}
                  onChange={(value) => updateSettings((current) => ({
                    ...current,
                    defaults: {
                      ...current.defaults,
                      workers: { ...current.defaults.workers, virtualWorkerProvider: value as ProviderConfigId },
                    },
                  }))}
                  options={workerInstanceOptions.length > 0 ? workerInstanceOptions : providerInstanceOptions}
                  aria-label="Virtual worker provider"
                />
              </Row>
            </SectionCard>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {enabledProviderInstances.map(([providerConfigId, provider]) => {
              const isDefault = settings.defaults.aiProvider.provider === providerConfigId;
              const isWorker = settings.defaults.workers.virtualWorkerProvider === providerConfigId;
              return (
                <div data-onboarding-card key={providerConfigId} className="flex items-center justify-between gap-3 rounded-3xl border border-black/[0.06] bg-white/75 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProviderBrandIcon id={(provider as any).provider} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-900 dark:text-white">{(provider as any).name}</div>
                      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{getProviderTypeLabel((provider as any).provider)}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {isDefault ? (
                      <span className="rounded-full border border-signal-500/25 bg-signal-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-signal-700 dark:text-signal-200">Default</span>
                    ) : null}
                    {isWorker ? (
                      <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">Worker</span>
                    ) : null}
                    {!isDefault && !isWorker ? (
                      <span className="rounded-full border border-black/[0.08] bg-black/[0.03] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:border-white/[0.08] dark:bg-white/[0.04]">Available</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
