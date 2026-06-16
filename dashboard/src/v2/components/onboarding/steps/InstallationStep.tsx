import type { FunctionComponent } from "preact";
import { RefreshCw, Check, AlertCircle } from "lucide-preact";
import type { OnboardingRuntimeReadiness } from "../../../../types.js";
import { getOSInfo } from "../onboarding-utils.js";

interface InstallationStepProps {
  readiness: OnboardingRuntimeReadiness;
  load: () => Promise<void>;
  platform: string;
}

export const InstallationStep: FunctionComponent<InstallationStepProps> = ({ readiness, load, platform }) => {
  return (
    <div className="space-y-4">
      <div data-onboarding-card className="rounded-[2rem] border border-black/[0.06] bg-white/75 p-6 shadow-[0_16px_42px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
        <h4 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Workspace runtime</h4>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Code UX builds isolated Docker environments for provider execution.
        </p>
        {(readiness as any).cluster?.status === "ready" ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-signal-500/20 bg-signal-500/10 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-500 text-white shadow-lg shadow-signal-500/30">
              <Check className="h-4 w-4" strokeWidth={3} />
            </div>
            <div>
              <div className="text-sm font-black text-signal-950 dark:text-signal-50">Local cluster online</div>
              <div className="text-xs text-signal-700 dark:text-signal-300">Container runtime is connected.</div>
            </div>
          </div>
        ) : (readiness as any).cluster?.status === "unavailable" ? (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30">
                <AlertCircle className="h-4 w-4" strokeWidth={3} />
              </div>
              <div>
                <div className="text-sm font-black text-rose-950 dark:text-rose-50">Cluster unreachable</div>
                <div className="text-xs text-rose-700 dark:text-rose-300">Make sure Docker Desktop is running and Code UX has access.</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        {readiness.dependencies.map((dependency: any) => (
          <div data-onboarding-card key={dependency.id} className="flex flex-col gap-3 rounded-[1.5rem] border border-black/[0.06] bg-white/60 p-4 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.02]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{dependency.label}</div>
                {dependency.installed ? (
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Found {dependency.version}</div>
                ) : (
                  <div className="mt-0.5 text-xs font-medium text-rose-500">Not installed</div>
                )}
              </div>
              <div className="flex shrink-0 items-center">
                {dependency.installed ? (
                  <div className="flex items-center gap-1.5 rounded-full border border-signal-500/20 bg-signal-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-signal-700 dark:text-signal-300">
                    <Check className="h-3 w-3" strokeWidth={3} /> Installed
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    <AlertCircle className="h-3 w-3" strokeWidth={3} /> Missing
                  </div>
                )}
              </div>
            </div>
            {!dependency.installed ? (
              <div className="mt-1 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                {(dependency.id === "docker-cli" || dependency.id === "docker-daemon") && (
                  <div className="flex flex-col gap-2 pt-1">
                    <a
                      href={getOSInfo(platform).dockerDesktopLink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-signal-500/20 bg-signal-500/10 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-signal-700 hover:bg-signal-500/15 dark:text-signal-200"
                    >
                      Docker Desktop for {getOSInfo(platform).osLabel}
                    </a>
                    <a
                      href={getOSInfo(platform).dockerDownloadLink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/[0.06] bg-black/[0.03] py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-slate-600 hover:bg-black/[0.06] dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.08]"
                    >
                      Docker Download
                    </a>
                  </div>
                )}
                {dependency.id === "git-cli" && (
                  <div className="flex flex-col gap-2 pt-1">
                    <a
                      href={getOSInfo(platform).gitLink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-signal-500/20 bg-signal-500/10 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-signal-700 hover:bg-signal-500/15 dark:text-signal-200"
                    >
                      Download Git for {getOSInfo(platform).osLabel}
                    </a>
                    <div className="rounded-lg bg-black/[0.04] px-2.5 py-1.5 font-mono text-[10px] text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
                      {getOSInfo(platform).gitInstruction}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-200">
        <RefreshCw className="h-4 w-4" />
        Recheck
      </button>
    </div>
  );
};
