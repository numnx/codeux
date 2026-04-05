import type { FunctionComponent } from "preact";
import { useState, useEffect, useLayoutEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { Save, X, RefreshCw } from "lucide-preact";
import type { AgentPreset } from "../../types.js";
import { AgentAvatarCustomizer } from "./AgentAvatarCustomizer.js";
import { BorderTrace } from "../ui/BorderTrace.js";
import { getAccentHex } from "../../lib/agent-avatar.js";

export const AgentPresetEditorPanel: FunctionComponent<{
  preset: AgentPreset;
  saving: boolean;
  defaultMemoryInstruction?: string;
  onSave: (id: string, updates: Partial<AgentPreset>) => void;
  onCancel: () => void;
}> = ({ preset, saving, defaultMemoryInstruction = "", onSave, onCancel }) => {
  const panelRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(preset.name);
  const [labels, setLabels] = useState(preset.labels.join(", "));
  const [instructionMarkdown, setInstructionMarkdown] = useState(preset.instructionMarkdown);
  const [memoryOverrideEnabled, setMemoryOverrideEnabled] = useState(!!preset.memoryTemplateOverrideEnabled);
  const [memoryMarkdown, setMemoryMarkdown] = useState(preset.memoryTemplateMarkdown ?? "");
  const [avatarConfig, setAvatarConfig] = useState(preset.avatarConfig);

  const accentHex = getAccentHex(avatarConfig?.accent);

  useEffect(() => {
    setName(preset.name);
    setLabels(preset.labels.join(", "));
    setInstructionMarkdown(preset.instructionMarkdown);
    setMemoryOverrideEnabled(!!preset.memoryTemplateOverrideEnabled);
    setMemoryMarkdown(preset.memoryTemplateMarkdown ?? "");
    setAvatarConfig(preset.avatarConfig);
  }, [preset]);

  useLayoutEffect(() => {
    if (!panelRef.current) return;
    gsap.fromTo(panelRef.current, { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" });
  }, [preset.id]);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onSave(preset.id, {
      name,
      labels: labels.split(",").map((l) => l.trim()).filter(Boolean),
      instructionMarkdown,
      memoryTemplateOverrideEnabled: memoryOverrideEnabled,
      memoryTemplateMarkdown: memoryOverrideEnabled ? memoryMarkdown : undefined,
      avatarConfig,
    });
  };

  const inputCls = "rounded-2xl border border-black/[0.06] bg-slate-50/80 px-4 py-3 text-base font-medium text-slate-900 outline-none transition-colors placeholder-slate-400 focus:border-signal-500 focus:ring-4 focus:ring-signal-500/10 dark:border-white/[0.08] dark:bg-void-800/60 dark:text-white dark:placeholder-slate-600 dark:focus:ring-signal-500/15";

  return (
    <form
      ref={panelRef}
      onSubmit={handleSubmit}
      className="relative flex flex-col gap-7 overflow-hidden rounded-[1.75rem] border border-black/[0.06] bg-white p-7 shadow-[0_4px_32px_rgba(0,0,0,0.06)] md:p-8 dark:border-white/[0.06] dark:bg-void-900 dark:shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
    >
      <BorderTrace accentHex={accentHex} />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/[0.04] pb-5 dark:border-white/[0.04]">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-500">Editing</span>
          <h2 className="font-display text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {name || "Unnamed Agent"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-transparent px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/[0.08] dark:text-slate-400 dark:hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/30"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-signal-500 px-6 py-2.5 text-sm font-bold text-slate-900 shadow-lg shadow-signal-500/15 transition-all hover:scale-[1.03] hover:bg-signal-400 hover:shadow-signal-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:text-void-900 dark:shadow-signal-500/20"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Save className="h-4 w-4" strokeWidth={2.5} />}
            Save Agent
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8 xl:flex-row">
        {/* Fields */}
        <div className="flex w-full flex-col gap-5 xl:w-1/2">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              Agent Name
            </label>
            <input type="text" value={name} onInput={(e) => setName(e.currentTarget.value)} placeholder="e.g. Planning Agent" required className={inputCls} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              Labels (comma separated)
            </label>
            <input type="text" value={labels} onInput={(e) => setLabels(e.currentTarget.value)} placeholder="e.g. planning, core" className={inputCls} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              System Instructions
            </label>
            <textarea value={instructionMarkdown} onInput={(e) => setInstructionMarkdown(e.currentTarget.value)} placeholder="Markdown instructions for this agent..." rows={8} className={inputCls} />
          </div>

          {/* Memory override */}
          <div className="flex flex-col gap-4 rounded-2xl border border-black/[0.04] bg-slate-50/50 p-5 dark:border-white/[0.04] dark:bg-void-800/30">
            <label className="flex cursor-pointer items-center gap-3">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={memoryOverrideEnabled}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;
                    setMemoryOverrideEnabled(checked);
                    if (checked && memoryMarkdown.trim() === "") {
                      setMemoryMarkdown(defaultMemoryInstruction);
                    }
                  }}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full border border-black/[0.08] bg-slate-200 peer-checked:bg-signal-500/25 transition-colors dark:border-white/[0.08] dark:bg-void-800" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all peer-checked:translate-x-5 peer-checked:bg-signal-500 dark:bg-slate-500 dark:peer-checked:bg-signal-400" />
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Memory Template Override
              </span>
            </label>
            {memoryOverrideEnabled && (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  Memory Template Markdown
                </label>
                <textarea
                  value={memoryMarkdown}
                  onInput={(e) => setMemoryMarkdown(e.currentTarget.value)}
                  placeholder="Override the default memory prompt template..."
                  rows={5}
                  className={inputCls}
                />
              </div>
            )}
          </div>
        </div>

        {/* Avatar customizer */}
        <div className="w-full xl:w-1/2">
          <AgentAvatarCustomizer
            config={avatarConfig || {}}
            onChange={setAvatarConfig}
          />
        </div>
      </div>
    </form>
  );
};
