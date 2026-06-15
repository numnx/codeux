import type { ProviderId } from "./provider-types.js";

export type OnboardingCheckStatus = "ready" | "warning" | "missing";

export type OnboardingClusterStatus = "ready" | "not_ready";

export interface OnboardingDependencyCheck {
  id: string;
  label: string;
  status: OnboardingCheckStatus;
  required: boolean;
  description: string;
  resolution: string;
  detail?: string;
}

export interface OnboardingProviderCredentialStatus {
  provider: ProviderId;
  label: string;
  authPath: string;
  available: boolean;
  mountEnabled: boolean;
  detectedFiles: string[];
  description: string;
}

export interface OnboardingRuntimeReadiness {
  checkedAt: string;
  cluster: {
    status: OnboardingClusterStatus;
    label: string;
    detail: string;
  };
  dependencies: OnboardingDependencyCheck[];
  providers: OnboardingProviderCredentialStatus[];
}

export interface UserOnboardingState {
  completed: boolean;
  onboardingCompletedAt: string | null;
}
