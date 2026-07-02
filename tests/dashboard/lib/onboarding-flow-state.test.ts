import { describe, it, expect } from "vitest";
import { getCanGoNext, getNextStepIndex, getPreviousStepIndex, isLastStep, ONBOARDING_STEPS, getReadinessByProvider, getClusterReady } from "../../../dashboard/src/v2/lib/onboarding-flow-state.js";
import type { OnboardingRuntimeReadiness } from "../../../dashboard/src/types.js";

describe("onboarding-flow-state", () => {
  it("determines if we can go next", () => {
    expect(getCanGoNext("installation", null)).toBe(true);
    expect(getCanGoNext("provider-setup", null)).toBe(false);
    expect(getCanGoNext("provider-setup", {} as any)).toBe(true);
  });

  it("calculates step indices correctly", () => {
    expect(getNextStepIndex(0)).toBe(1);
    expect(getNextStepIndex(ONBOARDING_STEPS.length - 1)).toBe(ONBOARDING_STEPS.length - 1);

    expect(getPreviousStepIndex(1)).toBe(0);
    expect(getPreviousStepIndex(0)).toBe(0);
  });

  it("determines last step correctly", () => {
    expect(isLastStep(ONBOARDING_STEPS.length - 1)).toBe(true);
    expect(isLastStep(0)).toBe(false);
  });

  it("extracts readiness by provider", () => {
    const readiness: OnboardingRuntimeReadiness = {
      checkedAt: "",
      cluster: { status: "ready", label: "", detail: "" },
      dependencies: [],
      providers: [
        { provider: "gemini", hasAuthDir: true, error: undefined },
        { provider: "codex", hasAuthDir: false, error: undefined }
      ]
    };

    const byProvider = getReadinessByProvider(readiness);
    expect(byProvider["gemini"]?.hasAuthDir).toBe(true);
    expect(byProvider["codex"]?.hasAuthDir).toBe(false);
  });

  it("determines cluster readiness", () => {
    const readyState: OnboardingRuntimeReadiness = {
      checkedAt: "",
      cluster: { status: "ready", label: "", detail: "" },
      dependencies: [],
      providers: []
    };
    expect(getClusterReady(readyState)).toBe(true);

    const notReadyState: OnboardingRuntimeReadiness = {
      checkedAt: "",
      cluster: { status: "not_ready", label: "", detail: "" },
      dependencies: [],
      providers: []
    };
    expect(getClusterReady(notReadyState)).toBe(false);
  });
});
