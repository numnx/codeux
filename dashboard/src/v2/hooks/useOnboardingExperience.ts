import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useOnboardingState } from "./useOnboardingState.js";
import { fetchOnboardingReadiness } from "../../lib/api/dashboard-api.js";
import { fetchSystemSettings, saveSystemSettings } from "../lib/settings-api.js";
import { ONBOARDING_OPEN_EVENT, ONBOARDING_STORAGE_KEY, startDashboardTour } from "../lib/onboarding-control.js";
import { applyAppearanceSettings } from "../lib/apply-appearance.js";
import type { OnboardingRuntimeReadiness, ProviderId, SystemSettings, ProviderConfigId, ProjectSettings, SystemProviderCredentialSettings, OnboardingProviderCredentialStatus } from "../../types.js";
import { defaultReadiness, getProviderInitialSelection, cloneSettings, syncProjectProvidersToIntegrationCatalog, PROVIDER_TYPES, steps, providerMountFields, providerLabels } from "../components/onboarding/onboarding-utils.js";
import { createSystemProviderDraft } from "../lib/settings-view-models.js";

type IntroPhase = "intro" | "transitioning" | "onboarding";

export const useOnboardingExperience = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [readiness, setReadiness] = useState<OnboardingRuntimeReadiness>(defaultReadiness);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<ProviderId[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introPhase, setIntroPhase] = useState<IntroPhase>("intro");

  const {
    state: onboardingUserState,
    loading: onboardingStateLoading,
    markCompleted: markOnboardingCompleted,
    reset: resetOnboardingState,
  } = useOnboardingState();

  useEffect(() => {
    if (onboardingStateLoading) {
      return;
    }
    setOpen(!onboardingUserState.completed);
  }, [onboardingStateLoading, onboardingUserState.completed]);

  useEffect(() => {
    const handleOpen = () => {
      setActiveStep(0);
      void resetOnboardingState();
      setOpen(true);
      setIntroPhase("intro");
    };
    window.addEventListener(ONBOARDING_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handleOpen);
  }, [resetOnboardingState]);

  const handleNext = useCallback(() => { setActiveStep((c) => Math.min(steps.length - 1, c + 1)); }, []);
  const handlePrev = useCallback(() => { setActiveStep((c) => Math.max(0, c - 1)); }, []);
  const handleJump = useCallback((index: number) => { setActiveStep(index); }, []);

  const handleIntroExitStart = useCallback(() => {
    setIntroPhase("transitioning");
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroPhase("onboarding");
  }, []);

  const load = useCallback(async () => {
    try {
      const [nextReadiness, nextSettings] = await Promise.all([
        fetchOnboardingReadiness(),
        fetchSystemSettings(),
      ]);
      setReadiness(nextReadiness);
      setSettings(nextSettings);
      setSelectedProviders((current) => current.length > 0 ? current : getProviderInitialSelection(nextReadiness.providers, nextSettings));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  }, []);

  useEffect(() => {
    if (open && introPhase === "onboarding") {
      void load();
    }
  }, [open, introPhase, load]);

  const active = steps[activeStep] ?? steps[0]!;

  const readinessByProvider = useMemo(
    () => Object.fromEntries(readiness.providers.map((provider: any) => [provider.provider, provider])) as Partial<Record<ProviderId, OnboardingProviderCredentialStatus>>,
    [readiness.providers],
  );

  const selectedProviderTypes = useMemo(
    () => PROVIDER_TYPES.filter((provider) => selectedProviders.includes(provider)),
    [readiness.providers, selectedProviders],
  );

  const updateSettings = useCallback((recipe: (current: SystemSettings) => SystemSettings) => {
    setSettings((current) => current ? recipe(cloneSettings(current)) : current);
  }, []);

  const updateAppearance = useCallback((updates: Partial<SystemSettings["defaults"]["appearance"]>) => {
    updateSettings((current) => {
      const nextAppearance = {
        ...current.defaults.appearance,
        ...updates,
      };
      applyAppearanceSettings(nextAppearance);
      return {
        ...current,
        defaults: {
          ...current.defaults,
          appearance: nextAppearance,
        },
      };
    });
  }, [updateSettings]);

  const updateCliWorkflow = useCallback((updates: Partial<SystemSettings["defaults"]["cliWorkflow"]>) => {
    updateSettings((current) => ({
      ...current,
      defaults: {
        ...current.defaults,
        cliWorkflow: {
          ...current.defaults.cliWorkflow,
          ...updates,
        },
      },
    }));
  }, [updateSettings]);

  const updateJira = useCallback((updates: Partial<SystemSettings["integrations"]["jira"]>) => {
    updateSettings((current) => ({
      ...current,
      integrations: {
        ...current.integrations,
        jira: {
          ...current.integrations.jira,
          ...updates,
        },
      },
    }));
  }, [updateSettings]);

  const toggleProvider = useCallback((providerId: ProviderId) => {
    setSelectedProviders((current) => {
      if (current.includes(providerId)) {
        return current.filter((id) => id !== providerId);
      }
      return [...current, providerId];
    });
  }, []);

  const addProviderInstance = useCallback((providerId: ProviderId) => {
    updateSettings((current) => {
      const providerConfigId = `${providerId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` as ProviderConfigId;
      const nextSettings = {
        ...current,
        integrations: {
          ...current.integrations,
          providers: {
            ...current.integrations.providers,
            [providerConfigId]: createSystemProviderDraft(providerId, (providerLabels as any)[providerId]),
          },
        },
      };
      return {
        ...nextSettings,
        defaults: syncProjectProvidersToIntegrationCatalog(nextSettings, nextSettings.integrations.providers),
      };
    });
  }, [updateSettings]);

  const configureProviderInstance = useCallback((
    providerConfigId: ProviderConfigId,
    updates: Partial<SystemProviderCredentialSettings>,
  ) => {
    updateSettings((current) => {
      const nextSettings = {
        ...current,
        integrations: {
          ...current.integrations,
          providers: {
            ...current.integrations.providers,
            [providerConfigId]: {
              ...current.integrations.providers[providerConfigId]!,
              ...updates,
            },
          },
        },
      };
      return {
        ...nextSettings,
        defaults: syncProjectProvidersToIntegrationCatalog(nextSettings, nextSettings.integrations.providers),
      };
    });
  }, [updateSettings]);

  const removeProviderInstance = useCallback((providerConfigId: ProviderConfigId) => {
    updateSettings((current) => {
      const nextProviders = { ...current.integrations.providers };
      delete nextProviders[providerConfigId];
      const nextSettings = {
        ...current,
        integrations: {
          ...current.integrations,
          providers: nextProviders,
        },
      };
      return {
        ...nextSettings,
        defaults: syncProjectProvidersToIntegrationCatalog(nextSettings, nextSettings.integrations.providers),
      };
    });
  }, [updateSettings]);

  const configureProjectProvider = useCallback((
    providerConfigId: ProviderConfigId,
    updates: Partial<ProjectSettings["aiProvider"]["providers"][ProviderConfigId]>,
  ) => {
    updateSettings((current) => ({
      ...current,
      defaults: {
        ...current.defaults,
        aiProvider: {
          ...current.defaults.aiProvider,
          providers: {
            ...current.defaults.aiProvider.providers,
            [providerConfigId]: {
              ...current.defaults.aiProvider.providers[providerConfigId]!,
              ...updates,
            },
          },
        },
      },
    }));
  }, [updateSettings]);

  const applyAndClose = useCallback(async () => {
    if (!settings) {
      await markOnboardingCompleted("complete");
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      setOpen(false);
      await navigate({ to: "/" });
      window.setTimeout(startDashboardTour, 260);
      return;
    }
    setSaving(true);
    try {
      let nextSettings = cloneSettings(settings);
      for (const provider of selectedProviderTypes) {
        if (!Object.values(nextSettings.integrations.providers).some((entry) => (entry as SystemProviderCredentialSettings).provider === provider)) {
          nextSettings.integrations.providers[provider as unknown as ProviderConfigId] = createSystemProviderDraft(provider, (providerLabels as any)[provider]);
          nextSettings.defaults = syncProjectProvidersToIntegrationCatalog(nextSettings, nextSettings.integrations.providers);
        }
        const readinessStatus = readinessByProvider[provider];
        const providerConfigIds = Object.entries(nextSettings.integrations.providers)
          .filter(([, entry]) => (entry as SystemProviderCredentialSettings).provider === provider)
          .map(([providerConfigId]) => providerConfigId as ProviderConfigId);
        for (const providerConfigId of providerConfigIds) {
          const integrationProvider = nextSettings.integrations.providers[providerConfigId];
          const projectProvider = nextSettings.defaults.aiProvider.providers[providerConfigId];
          const mountField = providerMountFields[provider];
          if (integrationProvider && readinessStatus?.available && !integrationProvider.apiKey.trim()) {
            nextSettings.integrations.providers[providerConfigId] = {
              ...integrationProvider,
              mountAuth: integrationProvider.mountAuth || provider !== "jules",
              authPath: integrationProvider.authPath || (readinessStatus as any).authPath,
            };
          }
          if (projectProvider) {
            nextSettings.defaults.aiProvider.providers[providerConfigId] = {
              ...projectProvider,
              enabled: true,
            };
          }
          if (mountField && readinessStatus?.available) {
            nextSettings.defaults.cliWorkflow[mountField] = true as never;
          }
        }
      }
      for (const [providerConfigId, projectProvider] of Object.entries(nextSettings.defaults.aiProvider.providers)) {
        if (!selectedProviderTypes.includes((projectProvider as any).provider)) {
          nextSettings.defaults.aiProvider.providers[providerConfigId as ProviderConfigId] = {
            ...projectProvider,
            enabled: false,
          } as any;
        }
      }
      nextSettings.defaults = syncProjectProvidersToIntegrationCatalog(nextSettings, nextSettings.integrations.providers);
      for (const [providerConfigId, projectProvider] of Object.entries(nextSettings.defaults.aiProvider.providers)) {
        nextSettings.defaults.aiProvider.providers[providerConfigId as ProviderConfigId] = {
          ...projectProvider,
          enabled: selectedProviderTypes.includes((projectProvider as any).provider),
        } as any;
      }
      const firstSelectedCliProvider = Object.entries(nextSettings.defaults.aiProvider.providers)
        .find(([, provider]) => (provider as any).enabled && (provider as any).provider !== "jules")?.[0];
      const chosenWorker = nextSettings.defaults.workers.virtualWorkerProvider;
      const chosenWorkerProvider = nextSettings.defaults.aiProvider.providers[chosenWorker] as any;
      const chosenWorkerValid = Boolean(chosenWorkerProvider?.enabled && chosenWorkerProvider.provider !== "jules");
      if (!chosenWorkerValid && firstSelectedCliProvider) {
        nextSettings.defaults.workers.virtualWorkerProvider = firstSelectedCliProvider as ProviderConfigId;
      }
      nextSettings = await saveSystemSettings(nextSettings);
      setSettings(nextSettings);
      await markOnboardingCompleted("complete");
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      setOpen(false);
      await navigate({ to: "/" });
      window.setTimeout(startDashboardTour, 260);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }, [settings, selectedProviderTypes, readinessByProvider, markOnboardingCompleted, navigate, setOpen, setSaving, setError, setSettings]);

  return {
    open,
    setOpen,
    activeStep,
    setActiveStep,
    readiness,
    settings,
    selectedProviders,
    setSelectedProviders,
    saving,
    error,
    introPhase,
    handleIntroExitStart,
    handleIntroComplete,
    handleNext,
    handlePrev,
    handleJump,
    load,
    active,
    readinessByProvider,
    selectedProviderTypes,
    updateSettings,
    updateAppearance,
    applyAndClose,
    setSettings,
    updateCliWorkflow,
    updateJira,
    toggleProvider,
    addProviderInstance,
    configureProviderInstance,
    removeProviderInstance,
    configureProjectProvider,
  };
};
