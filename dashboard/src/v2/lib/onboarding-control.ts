export const ONBOARDING_STORAGE_KEY = "codeux:onboarding-complete:v1";
export const ONBOARDING_OPEN_EVENT = "codeux:onboarding-open";

export const openOnboarding = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(ONBOARDING_OPEN_EVENT));
};
