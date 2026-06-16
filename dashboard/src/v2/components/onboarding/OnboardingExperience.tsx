import type { FunctionComponent } from "preact";
import { lazy, Suspense } from "preact/compat";
import { useEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";
import { OnboardingIntro } from "./OnboardingIntro.js";
import { InstallationStep } from "./steps/InstallationStep.js";
import { IntroductionStep } from "./steps/IntroductionStep.js";
import { SelectProvidersStep } from "./steps/SelectProvidersStep.js";
import { ProviderSetupStep } from "./steps/ProviderSetupStep.js";
import { GitStep } from "./steps/GitStep.js";
import { JiraStep } from "./steps/JiraStep.js";
import { AutomationStep } from "./steps/AutomationStep.js";
import { AppearanceStep } from "./steps/AppearanceStep.js";
import { DefaultProvidersStep } from "./steps/DefaultProvidersStep.js";
import { steps } from "./onboarding-utils.js";
import { useOnboardingExperience } from "../../hooks/useOnboardingExperience.js";
import { Loader2, Check } from "lucide-preact";

const DeepOceanBackground = lazy(async () => {
  const mod = await import("../chat/DeepOceanBackground.js");
  return { default: mod.DeepOceanBackground as FunctionComponent<{ forceDark?: boolean; className?: string }> };
});

export const OnboardingExperience: FunctionComponent = () => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const sideRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  const {
    open,
    activeStep,
    readiness,
    settings,
    selectedProviders,
    saving,
    error,
    introPhase,
    handleIntroComplete,
    handleIntroExitStart,
    handleNext,
    handlePrev,
    handleJump,
    setIntroPhase,
    updateSettings,
    load,
    updateCliWorkflow,
    applyAppearanceSettings,
    addProviderInstance,
    configureProviderInstance,
    removeProviderInstance,
    configureProjectProvider,
    toggleProviderInstance,
    completeSetup
  } = useOnboardingExperience();

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open || reducedMotion) return;

    gsap.fromTo(
      backdropRef.current,
      { opacity: 0, backdropFilter: "blur(0px)" },
      { opacity: 1, backdropFilter: "blur(8px)", duration: 0.8, ease: "power2.out" }
    );

    gsap.fromTo(
      shellRef.current,
      { opacity: 0, y: 40, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, delay: 0.2, ease: "back.out(1.2)" }
    );
  }, [open, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || introPhase === "intro") return;

    gsap.fromTo(
      contentRef.current,
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }
    );

    gsap.fromTo(
      sideRef.current,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.4, ease: "power2.out", delay: 0.1 }
    );
  }, [activeStep, introPhase, reducedMotion]);

  if (!open) return null;

  if (introPhase === "intro") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center isolate">
        <div ref={backdropRef} className="absolute inset-0 bg-codeux-background/80" />
        <div className="absolute inset-0 z-0">
          <Suspense fallback={null}>
            <DeepOceanBackground forceDark className="opacity-80" />
          </Suspense>
        </div>
        <div ref={shellRef} className="relative z-10 w-full max-w-4xl mx-auto px-4">
          <OnboardingIntro onStart={handleIntroExitStart} onComplete={handleIntroComplete} />
        </div>
      </div>
    );
  }

  const currentStepInfo = steps[activeStep];
  if (!currentStepInfo) return null;

  const renderCurrentStep = () => {
    switch (currentStepInfo.id) {
      case "installation":
        return <InstallationStep readiness={readiness} onNext={handleNext} onPrev={handlePrev} />;
      case "intro":
        return <IntroductionStep onNext={handleNext} />;
      case "providers":
        return (
          <SelectProvidersStep
            selectedProviders={selectedProviders}
            onToggle={toggleProviderInstance}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        );
      case "provider-setup":
        return (
          <ProviderSetupStep
            selectedProviders={selectedProviders}
            onProviderSetup={(id, updates) => configureProviderInstance(id, updates)}
            onNext={handleNext}
            onPrev={handlePrev}
            saving={saving}
          />
        );
      case "git":
        return (
          <GitStep
            settings={settings}
            onSave={(updates) => updateCliWorkflow(updates)}
            onNext={handleNext}
            onPrev={handlePrev}
            saving={saving}
            error={error}
          />
        );
      case "jira":
        return (
          <JiraStep
            settings={settings}
            updateSettings={updateSettings}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        );
      case "automation":
        return (
          <AutomationStep
            settings={settings}
            updateSettings={updateSettings}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        );
      case "appearance":
        return (
          <AppearanceStep
            settings={settings}
            updateSettings={updateSettings}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        );
      case "default-providers":
        return (
          <DefaultProvidersStep
            selectedProviders={selectedProviders}
            onNext={handleIntroComplete}
            onPrev={handlePrev}
            saving={saving}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 isolate">
      <div ref={backdropRef} className="absolute inset-0 bg-codeux-background/80" />
      <div className="absolute inset-0 z-0">
        <Suspense fallback={null}>
          <DeepOceanBackground forceDark className="opacity-80" />
        </Suspense>
      </div>

      <div
        ref={shellRef}
        className="relative z-10 w-full max-w-5xl h-[80vh] min-h-[600px] flex overflow-hidden rounded-2xl border border-codeux-border bg-codeux-background/50 shadow-2xl backdrop-blur-xl"
      >
        <div ref={sideRef} className="w-64 border-r border-codeux-border bg-codeux-muted/20 p-6 flex flex-col shrink-0">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-codeux-foreground">Setup</h2>
            <p className="text-sm text-codeux-muted-foreground mt-1">Configure your environment</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-1">
              {steps.map((step, index) => {
                const isActive = index === activeStep;
                const isPast = index < activeStep;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleJump(index)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left ${isActive ? "bg-codeux-primary/10 text-codeux-primary" : isPast ? "text-codeux-foreground" : "text-codeux-muted-foreground"}`}
                  >
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium ${isActive ? "border-codeux-primary bg-codeux-primary/20 text-codeux-primary" : isPast ? "border-codeux-primary bg-codeux-primary text-codeux-primary-foreground" : "border-codeux-border bg-codeux-muted/50"}`}>
                      {isPast ? <Check className="w-3.5 h-3.5" /> : index + 1}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? "text-codeux-primary" : ""}`}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-codeux-background">
          <div className="flex items-center justify-between px-8 py-6 border-b border-codeux-border">
            <div>
              <h1 className="text-xl font-semibold text-codeux-foreground">{currentStepInfo.label}</h1>
              <p className="text-sm text-codeux-muted-foreground mt-1">{currentStepInfo.description}</p>
            </div>
            {saving && (
              <div className="flex items-center gap-2 text-sm text-codeux-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
          </div>

          <div ref={contentRef} className="flex-1 overflow-y-auto p-8">
            {renderCurrentStep()}
          </div>
        </div>
      </div>
    </div>
  );
};
