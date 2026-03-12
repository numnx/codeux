import type { FunctionComponent } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import gsap from "gsap";
import {
  ChevronDown,
  ClipboardList,
  Loader2,
  Rocket,
  Save,
  Sparkles,
  Target,
  X,
} from "lucide-preact";
import type { Sprint } from "../../types.js";

export type SprintSubmitMode = "plan_and_start" | "plan_only" | "draft";

interface SprintDraftInput {
  name: string;
  goal: string;
}

interface AddSprintModalProps {
  nextId: string;
  initialSprint?: Sprint | null;
  planningConnectionLabel?: string | null;
  onClose: () => void;
  onImprovePrompt?: (draft: SprintDraftInput) => Promise<string>;
  onSubmit: (payload: SprintDraftInput & { submitMode: SprintSubmitMode }) => Promise<void> | void;
}

const CREATE_MODES: Array<{
  id: SprintSubmitMode;
  label: string;
  description: string;
  icon: typeof Rocket;
}> = [
  {
    id: "plan_and_start",
    label: "Plan & Start",
    description: "Create the sprint, let the Planning agent build subtasks, then start execution.",
    icon: Rocket,
  },
  {
    id: "plan_only",
    label: "Plan Only",
    description: "Create the sprint and have the Planning agent generate subtasks without starting it.",
    icon: ClipboardList,
  },
  {
    id: "draft",
    label: "Save Draft",
    description: "Create the sprint record only and keep it ready for later planning.",
    icon: Save,
  },
];

export const AddSprintModal: FunctionComponent<AddSprintModalProps> = ({
  nextId,
  initialSprint = null,
  planningConnectionLabel = null,
  onClose,
  onImprovePrompt,
  onSubmit,
}) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(initialSprint?.name || "");
  const [goal, setGoal] = useState(initialSprint?.goal || "");
  const [isImproving, setIsImproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitMode, setSubmitMode] = useState<SprintSubmitMode>("plan_and_start");
  const isEditing = Boolean(initialSprint);

  useLayoutEffect(() => {
    gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
    gsap.fromTo(
      cardRef.current,
      { y: 48, opacity: 0, scale: 0.94 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power4.out", delay: 0.05 },
    );
    if (fieldsRef.current) {
      gsap.fromTo(
        Array.from(fieldsRef.current.children),
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.07, duration: 0.45, ease: "power3.out", delay: 0.22 },
      );
    }
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const activeMode = CREATE_MODES.find((mode) => mode.id === submitMode) || CREATE_MODES[0]!;
  const ActiveModeIcon = activeMode.icon;

  const handleBackdropClick = (event: MouseEvent) => {
    if (event.target === backdropRef.current) {
      onClose();
    }
  };

  const handleImprovePrompt = async (): Promise<void> => {
    if (!onImprovePrompt || !name.trim() || !goal.trim()) {
      return;
    }
    setIsImproving(true);
    try {
      const improvedGoal = await onImprovePrompt({
        name: name.trim(),
        goal: goal.trim(),
      });
      setGoal(improvedGoal);
    } finally {
      setIsImproving(false);
    }
  };

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        goal: goal.trim(),
        submitMode: isEditing ? "draft" : submitMode,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[200] overflow-y-auto bg-black/55 backdrop-blur-xl dark:bg-black/75"
    >
      <div className="flex min-h-full items-start justify-center px-3 py-4 sm:px-6 sm:py-8 md:items-center">
        <div
          ref={cardRef}
          className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-y-auto rounded-[2rem] shadow-[0_40px_88px_rgba(0,0,0,0.28)] dark:shadow-[0_48px_96px_rgba(0,0,0,0.72)] md:max-h-[92vh] md:flex-row md:rounded-[2.4rem]"
        >
          <div className="relative flex w-full shrink-0 flex-col justify-between overflow-hidden bg-[#0d1113] p-5 text-white sm:p-6 md:w-64 md:p-8">
            <span className="pointer-events-none absolute -left-3 -top-2 select-none font-display text-[7.5rem] font-black leading-none tracking-tighter text-white/[0.035]">
              {isEditing ? "EDIT" : "SPR"}
            </span>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(0,224,160,0.16),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(255,184,0,0.14),transparent_35%)]" />
            <div className="relative z-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-signal-500">
              <Target className="h-3.5 w-3.5" strokeWidth={2.4} />
              {isEditing ? "Edit Sprint" : "New Sprint"}
            </div>
            <div className="relative z-10 space-y-4">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Sprint Key</div>
                <div className="mt-2 font-mono text-3xl font-black tracking-tight sm:text-4xl">{(initialSprint?.number ? `SPR-${initialSprint.number}` : nextId).toUpperCase()}</div>
              </div>
              <p className="max-w-[18rem] text-sm leading-relaxed text-white/55">
                {isEditing
                  ? "Refine the sprint definition and keep the Planning agent instructions intact."
                  : "Improve the prompt with AI first, then choose whether the Planning agent should plan and launch or only draft the sprint."}
              </p>
            </div>
            {!isEditing && (
              <div className="relative z-10 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-white/60">
                Planning and prompt improvement are worker-backed actions. A connected Planning worker needs to be available.
              </div>
            )}
          </div>

          <div className="flex-1 bg-white/98 p-5 dark:bg-void-800/98 sm:p-6 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4 md:mb-8">
              <div>
                <h2 className="font-display text-[1.75rem] font-black leading-none tracking-tight text-slate-900 dark:text-white sm:text-[2rem]">
                  {isEditing ? "Edit Sprint." : "Shape The Sprint."}
                </h2>
                <p className="mt-2 text-xs font-medium tracking-wide text-slate-400">
                  {isEditing
                    ? "Update the sprint metadata stored in the database."
                    : "Define the sprint once and let the Planning agent take care of the task breakdown."}
                </p>
                {!isEditing && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-black/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-300">
                    <Sparkles className="h-3 w-3 text-signal-500" strokeWidth={2.2} />
                    {planningConnectionLabel ? `Planning via ${planningConnectionLabel}` : "No Planning Connection"}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-slate-400 transition-all hover:bg-black/10 hover:text-slate-900 dark:bg-white/[0.05] dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div ref={fieldsRef} className="flex flex-col gap-6">
              <label className="space-y-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Sprint Name</span>
                <input
                  type="text"
                  value={name}
                  onInput={(event) => setName((event.target as HTMLInputElement).value)}
                  placeholder="Runtime hardening"
                  className="w-full border-0 border-b-2 border-black/[0.08] bg-transparent pb-3 font-display text-[1.7rem] font-black leading-none tracking-tight text-slate-900 outline-none transition-colors placeholder:text-slate-200 focus:border-signal-500 dark:border-white/[0.08] dark:text-white dark:placeholder:text-slate-700"
                  required
                  autoFocus
                />
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Sprint Prompt</label>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => { void handleImprovePrompt(); }}
                      disabled={isImproving || !name.trim() || !goal.trim()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-signal-500/20 bg-signal-500/[0.08] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-signal-600 transition-all hover:bg-signal-500/[0.14] disabled:cursor-not-allowed disabled:opacity-50 dark:text-signal-300"
                    >
                      {isImproving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" strokeWidth={2.3} />}
                      {isImproving ? "Improving" : "Improve with AI"}
                    </button>
                  )}
                </div>
                <div className={`rounded-[1.7rem] border bg-black/[0.025] transition-all dark:bg-white/[0.03] ${isImproving ? "border-signal-500/40 shadow-[0_0_0_1px_rgba(0,224,160,0.24),0_0_30px_rgba(0,224,160,0.12)]" : "border-black/[0.07] dark:border-white/[0.08]"}`}>
                  <textarea
                    value={goal}
                    onInput={(event) => setGoal((event.target as HTMLTextAreaElement).value)}
                    placeholder="Describe the sprint outcome, key systems, and what good looks like when this sprint is done."
                    className="min-h-[180px] w-full resize-none rounded-[1.7rem] bg-transparent px-4 py-4 text-sm leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-600 sm:min-h-[220px] md:min-h-[240px] md:px-5"
                  />
                </div>
              </div>

              {!isEditing && (
                <div className="rounded-[1.5rem] border border-black/[0.06] bg-black/[0.025] p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Creation Mode</div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMenuOpen((current) => !current)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-void-900"
                    >
                      <ActiveModeIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                      {activeMode.label}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`} strokeWidth={2.2} />
                    </button>
                    <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{activeMode.description}</p>
                  </div>
                  <div className={`expand-grid mt-4 ${menuOpen ? "expanded" : ""}`}>
                    <div className="expand-content">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        {CREATE_MODES.map((mode) => {
                          const ModeIcon = mode.icon;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => {
                                setSubmitMode(mode.id);
                                setMenuOpen(false);
                              }}
                              className={`rounded-[1.3rem] border px-4 py-4 text-left transition-all ${
                                submitMode === mode.id
                                  ? "border-signal-500/35 bg-signal-500/[0.08] text-slate-900 dark:text-white"
                                  : "border-black/[0.08] bg-white/70 text-slate-500 hover:border-black/[0.12] hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-400 dark:hover:border-white/[0.12]"
                              }`}
                            >
                              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em]">
                                <ModeIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                                {mode.label}
                              </div>
                              <div className="mt-2 text-xs leading-relaxed">{mode.description}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-semibold text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="inline-flex items-center gap-2.5 rounded-[1.2rem] bg-signal-500 px-6 py-3 text-sm font-bold text-void-900 shadow-[0_8px_28px_rgba(0,224,160,0.28)] transition-all hover:-translate-y-px hover:bg-signal-400 hover:shadow-[0_14px_38px_rgba(0,224,160,0.34)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ActiveModeIcon className="h-4 w-4" strokeWidth={2.4} />}
                {isEditing ? "Save Changes" : activeMode.label}
              </button>
            </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
