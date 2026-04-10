import type { FunctionComponent } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import gsap from "gsap";
import { ArrowLeft, Plus, Settings2, Trash2 } from "lucide-preact";
import type { SettingsPageState, IntegrationId } from "../../../hooks/use-settings-page-state.js";
import { NoticePanel, ActionButton } from "../SettingsSurface.js";
import { ProviderLogo, Row, TextInput, Toggle } from "../SettingsFormFields.js";
import type { ProjectSettings, ProviderConfigId, ProviderId, SystemSettings } from "../../../../types.js";
import {
  countConnectedProviders,
  createProjectProviderDraft,
  createSystemProviderDraft,
  getProviderAuthLabel,
  getProviderTypeLabel,
  getSystemProvidersByType,
  isProviderAvailable,
  sortProviderConfigEntries,
} from "../../../lib/settings-view-models.js";
import { SectionCard, getBadge as getBadgeHelper, getFieldBadge as getFieldBadgeHelper } from "./SharedPanelComponents.js";

const PROVIDER_TYPES: ProviderId[] = ["jules", "gemini", "codex", "claude-code"];

const buildProviderConfigId = (providerId: ProviderId): ProviderConfigId => (
  `${providerId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
);

const getFirstCliProviderConfigId = (providers: ProjectSettings["aiProvider"]["providers"]): ProviderConfigId | null => (
  Object.entries(providers).find(([, provider]) => provider.provider !== "jules")?.[0] || null
);

const syncProjectProvidersToIntegrationCatalog = (
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
  );

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
    : Object.keys(nextProjectProviders)[0] || null;
  const fallbackWorkerProvider = nextProjectProviders[settings.defaults.workers.virtualWorkerProvider]
    ? settings.defaults.workers.virtualWorkerProvider
    : getFirstCliProviderConfigId(nextProjectProviders)
      || fallbackGlobalProvider
      || settings.defaults.workers.virtualWorkerProvider;

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

export const SettingsIntegrationsPanel: FunctionComponent<{ state: SettingsPageState }> = ({ state }) => {
  const {
    activeScope,
    editableSettings,
    systemSettings,
    projectSources,
    selectedIntegration,
    setSelectedIntegration,
    integrations,
    importingHints,
    externalHints,
    handleImportHints,
    updateEditableSettings,
    updateSystem,
  } = state;

  const getBadge = (...prefixes: string[]) => getBadgeHelper(activeScope, projectSources, ...prefixes);
  const getFieldBadge = (path: string) => getFieldBadgeHelper(activeScope, projectSources, path);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [activeIntegrationDetail, setActiveIntegrationDetail] = useState<IntegrationId | null>(selectedIntegration);
  const isInitialMount = useRef(true);

  useLayoutEffect(() => {
    if (!containerRef.current || !listRef.current || !detailRef.current) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (selectedIntegration === null) {
        gsap.set(listRef.current, { display: "block", position: "relative", x: "0%", opacity: 1 });
        gsap.set(detailRef.current, { display: "none", position: "absolute", top: 0, left: 0, x: "100%", opacity: 0 });
      } else {
        gsap.set(listRef.current, { display: "none", position: "relative", x: "-100%", opacity: 0 });
        gsap.set(detailRef.current, { display: "block", position: "relative", top: "auto", left: "auto", x: "0%", opacity: 1 });
        gsap.set(containerRef.current, { height: "auto" });
      }
      return;
    }

    const enteringDetail = selectedIntegration !== null;
    const tl = gsap.timeline();

    if (enteringDetail) {
      setActiveIntegrationDetail(selectedIntegration);
      gsap.set(listRef.current, { display: "block", position: "relative", x: "0%", opacity: 1 });
      gsap.set(detailRef.current, { display: "block", position: "absolute", top: 0, left: 0, x: "100%", opacity: 0 });
      gsap.set(containerRef.current, { height: detailRef.current.offsetHeight });
      tl.to(listRef.current, { x: "-100%", opacity: 0, duration: 0.4, ease: "power3.inOut" }, 0)
        .to(detailRef.current, {
          x: "0%",
          opacity: 1,
          duration: 0.4,
          ease: "power3.inOut",
          onComplete: () => {
            if (listRef.current) gsap.set(listRef.current, { display: "none" });
            if (detailRef.current) gsap.set(detailRef.current, { position: "relative", top: "auto", left: "auto", x: "0%", opacity: 1 });
            if (containerRef.current) gsap.set(containerRef.current, { height: "auto" });
          },
        }, 0);
    } else {
      gsap.set(listRef.current, { display: "block", position: "absolute", top: 0, left: 0, x: "-100%", opacity: 0 });
      gsap.set(detailRef.current, { display: "block", position: "absolute", top: 0, left: 0, x: "0%", opacity: 1 });
      gsap.set(containerRef.current, { height: containerRef.current.offsetHeight });
      tl.to(detailRef.current, {
        x: "100%",
        opacity: 0,
        duration: 0.4,
        ease: "power3.inOut",
        onComplete: () => {
          setActiveIntegrationDetail(null);
          if (detailRef.current) gsap.set(detailRef.current, { display: "none" });
        },
      }, 0).to(listRef.current, {
        x: "0%",
        opacity: 1,
        duration: 0.4,
        ease: "power3.inOut",
        onComplete: () => {
          if (listRef.current) gsap.set(listRef.current, { position: "relative", top: "auto", left: "auto", x: "0%", opacity: 1 });
          if (containerRef.current) gsap.set(containerRef.current, { height: "auto" });
        },
      }, 0);
    }
  }, [selectedIntegration]);

  if (!editableSettings || !systemSettings) {
    return null;
  }

  const dockerExecutionEnabled = editableSettings.cliWorkflow.executionMode === "DOCKER";

  const getMountAuthEnabled = (providerId: ProviderId): boolean => (
    providerId === "gemini"
      ? editableSettings.cliWorkflow.containerMountGeminiAuth
      : providerId === "codex"
        ? editableSettings.cliWorkflow.containerMountCodexAuth
        : providerId === "claude-code"
          ? editableSettings.cliWorkflow.containerMountClaudeCodeAuth
          : false
  );

  const updateIntegrationProviders = (
    transform: (providers: SystemSettings["integrations"]["providers"]) => SystemSettings["integrations"]["providers"],
  ): void => {
    updateSystem((current) => {
      const nextProviders = transform({ ...current.integrations.providers });
      return {
        ...current,
        integrations: {
          ...current.integrations,
          providers: nextProviders,
        },
        defaults: syncProjectProvidersToIntegrationCatalog(current, nextProviders),
      };
    });
  };

  const addProviderInstance = (providerId: ProviderId): void => {
    if (activeScope !== "system") {
      setSelectedIntegration(providerId);
      return;
    }
    const count = getSystemProvidersByType(systemSettings, providerId).length + 1;
    const providerConfigId = buildProviderConfigId(providerId);
    const providerName = `${getProviderTypeLabel(providerId)} ${count}`;
    updateIntegrationProviders((providers) => ({
      ...providers,
      [providerConfigId]: createSystemProviderDraft(providerId, providerName),
    }));
    setSelectedIntegration(providerId);
  };

  const updateProviderInstance = (
    providerConfigId: ProviderConfigId,
    updates: Partial<SystemSettings["integrations"]["providers"][ProviderConfigId]>,
  ): void => {
    updateSystem((current) => {
      const nextProviders = {
        ...current.integrations.providers,
        [providerConfigId]: {
          ...current.integrations.providers[providerConfigId],
          ...updates,
        },
      };
      return {
        ...current,
        integrations: {
          ...current.integrations,
          providers: nextProviders,
        },
        defaults: syncProjectProvidersToIntegrationCatalog(current, nextProviders),
      };
    });
  };

  const removeProviderInstance = (providerConfigId: ProviderConfigId): void => {
    updateIntegrationProviders((providers) => {
      const nextProviders = { ...providers };
      delete nextProviders[providerConfigId];
      return nextProviders;
    });
  };

  const renderProviderMountSettings = (providerId: ProviderId) => {
    const mountField = providerId === "gemini"
      ? "containerMountGeminiAuth"
      : providerId === "codex"
        ? "containerMountCodexAuth"
        : "containerMountClaudeCodeAuth";
    const pathField = providerId === "gemini"
      ? "containerGeminiAuthPath"
      : providerId === "codex"
        ? "containerCodexAuthPath"
        : "containerClaudeCodeAuthPath";
    const enabled = getMountAuthEnabled(providerId);
    const pathValue = editableSettings.cliWorkflow[pathField];

    return (
      <>
        <Row label={`Mount ${getProviderTypeLabel(providerId)} auth`} description={`Copy ${getProviderTypeLabel(providerId)} host auth into Docker for this scope.`} badge={getFieldBadge(`cliWorkflow.${mountField}`)}>
          <Toggle value={enabled} onChange={() => updateEditableSettings((current) => ({
            ...current,
            cliWorkflow: {
              ...current.cliWorkflow,
              [mountField]: !current.cliWorkflow[mountField],
            },
          }))} />
        </Row>
        <Row label={`${getProviderTypeLabel(providerId)} auth path`} description="Host path copied into the Docker runtime for this provider type." badge={getFieldBadge(`cliWorkflow.${pathField}`)} last>
          <TextInput
            value={pathValue}
            onChange={(value) => updateEditableSettings((current) => ({
              ...current,
              cliWorkflow: {
                ...current.cliWorkflow,
                [pathField]: value,
              },
            }))}
            disabled={!enabled}
            mono
          />
        </Row>
      </>
    );
  };

  const renderIntegrationDetail = () => {
    const integrationId = activeIntegrationDetail || selectedIntegration;
    if (!integrationId) return null;

    const backButton = (
      <button className="mb-4 flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white" onClick={() => setSelectedIntegration(null)}>
        <ArrowLeft className="h-4 w-4" />
        Back to Integrations
      </button>
    );

    if (integrationId === "github") {
      return (
        <>
          {backButton}
          <SectionCard title="GitHub Configuration" watermark="GIT">
            <Row label="GitHub token" description="System token used for repository, PR, and CI integration." last>
              <TextInput
                value={systemSettings.integrations.githubToken}
                onChange={(value) => updateSystem((current) => ({
                  ...current,
                  integrations: {
                    ...current.integrations,
                    githubToken: value,
                  },
                }))}
                mono
              />
            </Row>
          </SectionCard>
        </>
      );
    }

    const providerId = integrationId as ProviderId;
    const providerEntries = sortProviderConfigEntries(getSystemProvidersByType(systemSettings, providerId));

    if (activeScope === "project") {
      return (
        <>
          {backButton}
          <SectionCard title={`${getProviderTypeLabel(providerId)} Integration`} watermark={providerId === "jules" ? "JLS" : providerId === "gemini" ? "GMN" : providerId === "codex" ? "CDX" : "CLD"}>
            <NoticePanel title="System-owned credentials">
              Provider credentials are managed at system scope. Project scope controls whether Docker should copy host auth for this CLI type.
            </NoticePanel>
            {providerId === "jules" ? (
              <NoticePanel title="Jules API">
                Jules does not use a provider-auth mount. Configure named Jules credentials from system scope.
              </NoticePanel>
            ) : renderProviderMountSettings(providerId)}
          </SectionCard>
        </>
      );
    }

    return (
      <>
        {backButton}
        <SectionCard title={`${getProviderTypeLabel(providerId)} Credentials`} watermark={providerId === "jules" ? "JLS" : providerId === "gemini" ? "GMN" : providerId === "codex" ? "CDX" : "CLD"}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] border border-black/[0.06] bg-black/[0.02] px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{getProviderTypeLabel(providerId)} instances</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Add as many named credentials as you need. AI Models routes each one independently for manual or weighted selection.
              </div>
            </div>
            <ActionButton label="Add instance" onClick={() => addProviderInstance(providerId)} />
          </div>

          {providerEntries.length === 0 ? (
            <NoticePanel title="No credentials yet">
              Add a {getProviderTypeLabel(providerId)} instance to make it available for routing.
            </NoticePanel>
          ) : (
            providerEntries.map(([providerConfigId, provider], index) => (
              <div key={providerConfigId} className="rounded-[1.45rem] border border-black/[0.06] bg-white/82 p-4 dark:border-white/[0.06] dark:bg-white/[0.04]">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] pb-4 dark:border-white/[0.06]">
                  <div className="flex items-start gap-3">
                    <ProviderLogo providerId={provider.provider} />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{provider.name}</div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{getProviderTypeLabel(provider.provider)} instance</div>
                    </div>
                  </div>
                  {providerEntries.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeProviderInstance(providerConfigId)}
                      className="inline-flex items-center gap-2 rounded-full border border-status-red/20 bg-status-red/[0.06] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-status-red"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  ) : null}
                </div>
                <Row label="Display name" description="Used throughout AI Models and runtime route summaries.">
                  <TextInput value={provider.name} onChange={(value) => updateProviderInstance(providerConfigId, { name: value })} />
                </Row>
                <Row label="API key" description="Stored for this named provider instance." last={providerId === "jules" || index === providerEntries.length - 1}>
                  <TextInput value={provider.apiKey} onChange={(value) => updateProviderInstance(providerConfigId, { apiKey: value })} mono />
                </Row>
              </div>
            ))
          )}

          {providerId !== "jules" ? (
            <div className="rounded-[1.25rem] border border-black/[0.06] bg-black/[0.02] px-4 py-3 text-xs leading-relaxed text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-400">
              Docker auth-copy mounts remain provider-type level, not instance level. They make a CLI type available even without an API key, but routing still selects among named instances on the AI Models page.
            </div>
          ) : null}
        </SectionCard>
      </>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Integrations" watermark="INT" badge={getBadge("integrations", "cliWorkflow")}>
        <div ref={containerRef} className="relative w-full overflow-hidden">
          <div ref={listRef} className="w-full">
            <div className="rounded-[1.5rem] border border-black/[0.06] bg-black/[0.02] p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] pb-4 dark:border-white/[0.06]">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Integration catalog</div>
                  <div className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    Add and manage named provider credentials. The AI Models page routes each configured instance independently.
                  </div>
                </div>
                <ActionButton label="Import host hints" onClick={() => void handleImportHints()} busy={importingHints} />
              </div>

              <div className="flex flex-col gap-3">
                {integrations.map((integration, index) => {
                  if (integration.id === "github") {
                    return (
                      <div key={integration.id} className={`flex items-center justify-between gap-4 rounded-[1.25rem] border border-black/[0.06] bg-white/82 px-4 py-4 dark:border-white/[0.06] dark:bg-white/[0.04] ${index === integrations.length - 1 ? "" : ""}`}>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">{integration.label}</div>
                          <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{integration.description}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setSelectedIntegration("github")} className="rounded-full border border-black/[0.08] bg-black/[0.03] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300">
                            Manage
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const providerId = integration.id as ProviderId;
                  const connectedCount = countConnectedProviders(providerId, systemSettings, externalHints);
                  const active = isProviderAvailable(providerId, systemSettings, externalHints, getMountAuthEnabled(providerId));
                  const authLabel = getProviderAuthLabel(providerId, systemSettings, externalHints, dockerExecutionEnabled, getMountAuthEnabled(providerId));

                  return (
                    <div key={integration.id} className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-black/[0.06] bg-white/82 px-4 py-4 dark:border-white/[0.06] dark:bg-white/[0.04]">
                      <div className="flex items-start gap-3">
                        <ProviderLogo providerId={providerId} disabled={!active} />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{integration.label}</div>
                            {active ? (
                              <span className="rounded-full border border-signal-500/20 bg-signal-500/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-signal-700 dark:text-signal-200">
                                Active
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{integration.description}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full border border-black/[0.08] bg-black/[0.03] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400">
                              {connectedCount} connected
                            </span>
                            {authLabel ? (
                              <span className="rounded-full border border-black/[0.08] bg-black/[0.03] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400">
                                {authLabel}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={activeScope !== "system"}
                          onClick={() => addProviderInstance(providerId)}
                          className="rounded-full border border-signal-500/20 bg-signal-500/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-signal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-signal-200"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedIntegration(providerId)}
                          className="rounded-full border border-black/[0.08] bg-black/[0.03] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div ref={detailRef} className="w-full">
            {renderIntegrationDetail()}
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
