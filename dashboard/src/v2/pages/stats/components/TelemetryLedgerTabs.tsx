import type { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import { TelemetryLedger } from "./TelemetryLedger.js";
import { GitTelemetryTab } from "./GitTelemetryTab.js";
import { PANEL_CLASS } from "./StatsShared.js";

export const TelemetryLedgerTabs: FunctionComponent<any> = ({ stats }) => {
  const [activeTab, setActiveTab] = useState<"tasks" | "sprints" | "git">("tasks");

  return (
    <div className={`${PANEL_CLASS} flex flex-col`}>
      <div className="mx-6 mt-6 flex w-fit items-center gap-2 rounded-2xl bg-black/[0.03] p-1.5 dark:bg-white/[0.03]">
        <button
          type="button"
          onClick={() => setActiveTab("tasks")}
          className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "tasks"
              ? "bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:bg-void-800 dark:text-white dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Task Telemetry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sprints")}
          className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "sprints"
              ? "bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:bg-void-800 dark:text-white dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Sprint Telemetry
        </button>
        {stats.git ? (
          <button
            type="button"
            onClick={() => setActiveTab("git")}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              activeTab === "git"
                ? "bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:bg-void-800 dark:text-white dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Git Telemetry
          </button>
        ) : null}
      </div>

      <div className="flex-1 px-6 pb-6 pt-5">
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
