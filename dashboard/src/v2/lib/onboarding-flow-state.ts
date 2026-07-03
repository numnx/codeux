import type { SystemSettings, OnboardingRuntimeReadiness } from "../../types.js";

export type StepId = "installation" | "introduction" | "providers" | "provider-setup" | "git" | "jira" | "defaults" | "automation" | "appearance";

export const ONBOARDING_STEPS: Array<{ id: StepId; label: string }> = [
  { id: "installation", label: "Installation" },
  { id: "introduction", label: "Introduction" },
  { id: "providers", label: "Select Providers" },
  { id: "provider-setup", label: "Providers" },
  { id: "git", label: "Git" },
  { id: "jira", label: "Jira" },
  { id: "defaults", label: "Default providers" },
  { id: "automation", label: "Automation" },
  { id: "appearance", label: "Appearance" },
];

export const getCanGoNext = (
  activeStepId: StepId,
  settings: SystemSettings | null
): boolean => {
  const stepNeedsSettings: StepId[] = ["provider-setup", "git", "jira", "automation", "appearance", "defaults"];
  return !stepNeedsSettings.includes(activeStepId) || Boolean(settings);
};

export const getNextStepIndex = (currentStep: number): number =>
  Math.min(ONBOARDING_STEPS.length - 1, currentStep + 1);

export const getPreviousStepIndex = (currentStep: number): number =>
  Math.max(0, currentStep - 1);

export const isLastStep = (currentStep: number): boolean =>
  currentStep === ONBOARDING_STEPS.length - 1;

export const getReadinessByProvider = (readiness: OnboardingRuntimeReadiness) =>
  Object.fromEntries(readiness.providers.map((provider) => [provider.provider, provider]));

export const getClusterReady = (readiness: OnboardingRuntimeReadiness): boolean =>
  readiness.cluster.status === "ready";
