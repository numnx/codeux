import type { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import { TelemetryLedger } from "./TelemetryLedger.js";
import { GitTelemetryTab } from "./GitTelemetryTab.js";
import { PANEL_CLASS } from "./StatsShared.js";

export const TelemetryLedgerTabs: FunctionComponent<any> = ({ stats }) => {
  const [activeTab, setActiveTab] = useState<"tasks" | "sprints" | "git">("tasks");

  return (
    <div className={`${PANEL_CLASS} flex flex-col`}>
      <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08]">
        <div className="inline-flex rounded-full bg-slate-100 p-1 dark:bg-void-900 border border-black/[0.06] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`rounded-full px-5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
              activeTab === "tasks"
                ? "bg-white text-slate-900 shadow-sm dark:bg-void-800 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Tasks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sprints")}
            className={`rounded-full px-5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
              activeTab === "sprints"
                ? "bg-white text-slate-900 shadow-sm dark:bg-void-800 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Sprints
          </button>
          {stats.git ? (
            <button
              type="button"
              onClick={() => setActiveTab("git")}
              className={`rounded-full px-5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                activeTab === "git"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-void-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Git
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 p-6">
        {activeTab === "git" && stats.git ? (
          <GitTelemetryTab gitStats={stats.git} />
        ) : activeTab === "sprints" ? (
          <TelemetryLedger
            title="Sprint Telemetry"
            eyebrow="Sprint Ledger"
            items={stats.sprints}
            kindLabel="sprints"
            emptyLabel="No sprint telemetry active in this window."
          />
        ) : (
          <TelemetryLedger
            title="Task Telemetry"
            eyebrow="Task Ledger"
            items={stats.tasks}
            kindLabel="tasks"
            emptyLabel="No task telemetry landed in this window yet."
          />
        )}
      </div>
    </div>
  );
};
