import type { FunctionComponent } from "preact";
import type { SystemSettings } from "../../../../types.js";
import { PillChoiceGroup, SelectInput } from "../../settings/SettingsFormFields.js";

interface AppearanceStepProps {
  settings: SystemSettings | null;
  updateAppearance: (updates: Partial<SystemSettings["defaults"]["appearance"]>) => void;
}

export const AppearanceStep: FunctionComponent<AppearanceStepProps> = ({ settings, updateAppearance }) => {
  if (!settings) return null;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Core Layout & Feel */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-signal-400">Core Display</h4>

          <div className="rounded-3xl border border-black/[0.06] bg-white/75 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
            <div className="text-sm font-black text-slate-900 dark:text-white">Theme</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Select light, dark, or sync with your system.</div>
            <div className="mt-4">
              <PillChoiceGroup
                value={settings.defaults.appearance.theme}
                onChange={(value) => updateAppearance({ theme: value as any })}
                options={[
                  { value: "SYSTEM", label: "System" },
                  { value: "LIGHT", label: "Light" },
                  { value: "DARK", label: "Dark" },
                ]}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-black/[0.06] bg-white/75 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
            <div className="text-sm font-black text-slate-900 dark:text-white">Navigation Mode</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose between floating dock or sidebar.</div>
            <div className="mt-4">
              <PillChoiceGroup
                value={settings.defaults.appearance.navigationMode}
                onChange={(value) => updateAppearance({ navigationMode: value as any })}
                options={[
                  { value: "DOCK", label: "Dock" },
                  { value: "SIDEBAR", label: "Sidebar" },
                ]}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-black/[0.06] bg-white/75 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
            <div className="text-sm font-black text-slate-900 dark:text-white">Reduced Motion</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Limit interface animations.</div>
            <div className="mt-4">
              <PillChoiceGroup
                value={settings.defaults.appearance.reducedMotion}
                onChange={(value) => updateAppearance({ reducedMotion: value as any })}
                options={[
                  { value: "AUTO", label: "Auto" },
                  { value: "REDUCE", label: "Reduce" },
                  { value: "NONE", label: "None" },
                ]}
              />
            </div>
          </div>

          {typeof window !== "undefined" && Boolean((window as any).codeUxDesktop?.setZoom) && (
            <div className="rounded-3xl border border-black/[0.06] bg-white/75 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
              <div className="text-sm font-black text-slate-900 dark:text-white">Zoom Level</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Scale the desktop interface size.</div>
              <div className="mt-4">
                <SelectInput
                  value={String(settings.defaults.appearance.zoomLevel ?? 1)}
                  onChange={(value) => updateAppearance({ zoomLevel: Number(value) })}
                  options={[
                    { value: "0.75", label: "75%" },
                    { value: "0.9", label: "90%" },
                    { value: "1", label: "100%" },
                    { value: "1.1", label: "110%" },
                    { value: "1.25", label: "125%" },
                    { value: "1.5", label: "150%" },
                    { value: "1.75", label: "175%" },
                    { value: "2", label: "200%" },
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Custom Aesthetics & Background */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-signal-400">Background & Styling</h4>

          <div className="rounded-3xl border border-black/[0.06] bg-white/75 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
            <div className="text-sm font-black text-slate-900 dark:text-white">Background Mode</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Select animated textures or a flat color.</div>
            <div className="mt-4">
              <PillChoiceGroup
                value={settings.defaults.appearance.backgroundMode || "ANIMATED"}
                onChange={(value) => updateAppearance({ backgroundMode: value as any })}
                options={[
                  { value: "ANIMATED", label: "Animated" },
                  { value: "STATIC", label: "Static" },
                ]}
              />
            </div>
          </div>

          {(settings.defaults.appearance.backgroundMode || "ANIMATED") === "STATIC" && (
            <div className="rounded-3xl border border-black/[0.06] bg-white/75 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
              <div className="text-sm font-black text-slate-900 dark:text-white">Static Color</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose a solid solid back color.</div>
              <div className="mt-4 flex items-center gap-3">
                <input
                  type="color"
                  value={settings.defaults.appearance.staticBackgroundColor || "#0d0f12"}
                  onInput={(e) => updateAppearance({ staticBackgroundColor: (e.target as HTMLInputElement).value })}
                  className="h-10 w-20 cursor-pointer rounded-lg border-2 border-black/[0.06] bg-transparent p-1 focus:outline-none focus:ring-2 focus:ring-signal-500 dark:border-white/[0.06]"
                />
                <span className="font-mono text-sm uppercase text-slate-500 dark:text-slate-400">
                  {settings.defaults.appearance.staticBackgroundColor || "#0d0f12"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
