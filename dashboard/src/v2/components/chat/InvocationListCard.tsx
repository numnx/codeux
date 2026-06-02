import type { ComponentChildren, FunctionComponent } from "preact";
import type { ExecutionInvocationRecord, AgentPreset } from "../../types.js";
import { formatRelativeChatTime } from "../../lib/chat-time.js";
import { Loader2, Layers, ListChecks } from "lucide-preact";
import { ProviderLogo } from "../ui/ProviderLogo.js";
import { WaveFluid } from "../ui/WaveFluid.js";
import { BorderTrace } from "../ui/BorderTrace.js";
import { AgentSelectAvatarIcon } from "../agents/AgentSelectAvatarIcon.js";
import { formatTokenCount } from "../../lib/chat-widget-view-models.js";

const formatErrorCategory = (value: ExecutionInvocationRecord["lastErrorCategory"]): string | null => {
  switch (value) {
    case "RATE_LIMITED": return "Rate limited";
    case "QUOTA_EXHAUSTED": return "Quota exhausted";
    case "AUTH_FAILURE": return "Auth failure";
    case "PROVIDER_NOT_FOUND": return "Provider missing";
    case "UNKNOWN": return "Error";
    default: return null;
  }
};

const getInvocationAccent = (status: string): string => {
  switch (status) {
    case "running": return "#00E0A0";
    case "completed": return "#00AB84";
    case "failed": return "#E3000F";
    case "paused": return "#F59E0B";
    default: return "#94a3b8";
  }
};

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  running: { dot: "bg-signal-500 shadow-[0_0_8px_rgba(0,224,160,0.6)]", text: "text-signal-500" },
  completed: { dot: "bg-[#00AB84] shadow-[0_0_6px_rgba(0,171,132,0.4)]", text: "text-[#00AB84]" },
  failed: { dot: "bg-status-red shadow-[0_0_8px_rgba(227,0,15,0.5)]", text: "text-status-red" },
  cancelled: { dot: "bg-slate-400", text: "text-slate-400" },
  paused: { dot: "bg-status-amber shadow-[0_0_6px_rgba(245,158,11,0.4)]", text: "text-status-amber" },
};

const DEFAULT_STATUS_STYLE = { dot: "bg-slate-400", text: "text-slate-500" };

/** Human-friendly titles for the invocation purpose, falling back to a title-cased type. */
const PURPOSE_LABELS: Record<string, string> = {
  planning: "Planning",
  cli_task_coding: "Task Coding",
  cli_task_review: "Task Review",
  cli_qa: "QA Review",
  dashboard_reply: "Chat Reply",
  worker_dispatch: "Worker Dispatch",
};

const formatPurpose = (type: string): string =>
  PURPOSE_LABELS[type]
  ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Compact elapsed/total duration between two ISO timestamps (end defaults to now). */
const formatDuration = (startIso: string | null, endIso: string | null): string | null => {
  if (!startIso) return null;
  const start = Date.parse(startIso);
  const end = endIso ? Date.parse(endIso) : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const totalSeconds = Math.round((end - start) / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes ? `${hours}h ${remMinutes}m` : `${hours}h`;
};

interface StatCell {
  label: string;
  value: ComponentChildren;
  /** Optional value-text color override (e.g. token accents). */
  tone?: string;
  /** Render across both columns (used for the error row). */
  full?: boolean;
}

/** Small linked pill used for the sprint key / task number chips. */
const ContextChip: FunctionComponent<{ href: string; title?: string; icon: ComponentChildren; label: string }> = ({ href, title, icon, label }) => (
  <a
    href={href}
    title={title}
    onClick={(event) => event.stopPropagation()}
    className="inline-flex items-center gap-1 rounded-md border border-black/[0.07] bg-black/[0.03] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 transition-colors hover:border-signal-500/40 hover:bg-signal-500/[0.08] hover:text-signal-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400 dark:hover:text-signal-400"
  >
    {icon}
    {label}
  </a>
);

export const InvocationListCard: FunctionComponent<{
  invocations: ExecutionInvocationRecord[];
  selectedInvocationId: string | null;
  onSelect: (invocationId: string) => void;
  agentPresets?: AgentPreset[];
  sprintKeyPrefix?: string;
}> = ({ invocations, selectedInvocationId, onSelect, agentPresets, sprintKeyPrefix = "SPR" }) => (
  <div className="space-y-3">
    {invocations.map((invocation) => {
      const accentHex = getInvocationAccent(invocation.status);
      const ss = STATUS_STYLES[invocation.status] || DEFAULT_STATUS_STYLE;
      const isSelected = selectedInvocationId === invocation.id;
      const isRunning = invocation.status === "running";
      const isOptimistic = invocation.id.startsWith("optimistic:");
      const agentPreset = invocation.agentPresetId
        ? agentPresets?.find((p) => p.id === invocation.agentPresetId)
        : undefined;

      const errorLabel = formatErrorCategory(invocation.lastErrorCategory);
      const duration = formatDuration(invocation.startedAt || invocation.createdAt, invocation.finishedAt);
      const totalTokens = invocation.totalTokens
        ?? ((invocation.inputTokens ?? 0) + (invocation.outputTokens ?? 0));

      // Sprint key / task number chips, linked to their respective pages.
      const sprintKey = invocation.sprintNumber != null ? `${sprintKeyPrefix}-${invocation.sprintNumber}` : null;
      const sprintHref = sprintKey ? `/sprints?sprintKey=${encodeURIComponent(sprintKey)}` : null;
      const taskHref = invocation.taskId
        ? `/tasks?${invocation.sprintId ? `sprintId=${encodeURIComponent(invocation.sprintId)}&` : ""}taskId=${encodeURIComponent(invocation.taskId)}`
        : null;

      // The stat table — only meaningful rows are shown. Status leads, then the
      // token breakdown, run size and timing. Kept to clean label/value pairs.
      const cells: StatCell[] = [
        {
          label: "Status",
          value: (
            <span className={`flex items-center gap-1.5 ${ss.text}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${ss.dot} ${isRunning ? "animate-pulse" : ""}`} />
              <span className="capitalize">{isOptimistic ? "Pending" : invocation.status}</span>
            </span>
          ),
        },
        { label: "Messages", value: invocation.messageCount ?? 0 },
      ];
      if ((invocation.inputTokens ?? 0) > 0) {
        cells.push({ label: "Input", value: formatTokenCount(invocation.inputTokens), tone: "text-signal-600 dark:text-signal-400" });
      }
      if ((invocation.outputTokens ?? 0) > 0) {
        cells.push({ label: "Output", value: formatTokenCount(invocation.outputTokens), tone: "text-purple-600 dark:text-purple-400" });
      }
      if ((invocation.cachedInputTokens ?? 0) > 0) {
        cells.push({ label: "Cached", value: formatTokenCount(invocation.cachedInputTokens), tone: "text-teal-600 dark:text-teal-400" });
      }
      if (totalTokens > 0) {
        cells.push({ label: "Total", value: formatTokenCount(totalTokens) });
      }
      if (duration) {
        cells.push({ label: "Duration", value: duration });
      }
      if (errorLabel) {
        cells.push({ label: "Error", value: errorLabel, tone: "text-status-amber", full: true });
      }
      // Balance the grid: a lone trailing cell stretches across both columns.
      const lastIndex = cells.length - 1;
      const stretchLast = cells.length % 2 === 1 && !cells[lastIndex].full;

      return (
        <div key={invocation.id} className="group relative overflow-hidden rounded-[1.5rem]">
          {/* Rendered as a clickable div (not a button) so the sprint/task links
              below can be real anchors without nesting interactive elements. */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect(invocation.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(invocation.id);
              }
            }}
            className={`w-full cursor-pointer rounded-[1.5rem] p-4 text-left transition-all duration-200
              bg-white/70 dark:bg-void-800/60 backdrop-blur-2xl
              shadow-[0_2px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]
              ${isOptimistic ? "opacity-70" : ""}
              ${isSelected
                ? "border-2 border-signal-500/30 shadow-[0_0_24px_rgba(0,224,160,0.08)]"
                : "border-2 border-black/[0.06] dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12]"
              }`}
          >
            <WaveFluid accentHex={accentHex} isActive={isRunning} />
            <BorderTrace accentHex={accentHex} />

            <div className="relative z-10">
              {/* Header: icon + purpose/model, plus relative time */}
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${accentHex}14` }}
                >
                  {agentPreset ? (
                    <AgentSelectAvatarIcon avatarConfig={agentPreset.avatarConfig} seed={`${agentPreset.id}:${agentPreset.name}`} />
                  ) : (
                    <ProviderLogo provider={invocation.provider || ""} size={18} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-[15px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
                    {formatPurpose(invocation.type)}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {isOptimistic && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span className="truncate font-medium">
                      {invocation.provider || "—"}
                      {invocation.model ? <span className="text-slate-400 dark:text-slate-500"> · {invocation.model}</span> : null}
                    </span>
                    {agentPreset && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="truncate font-medium">{agentPreset.name}</span>
                      </>
                    )}
                  </div>
                </div>

                <span className="shrink-0 pt-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                  {formatRelativeChatTime(invocation.lastMessageAt || invocation.createdAt)}
                </span>
              </div>

              {/* Sprint key / task number — linked to their respective pages */}
              {(sprintHref || taskHref) && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {sprintHref && sprintKey && (
                    <ContextChip
                      href={sprintHref}
                      title={invocation.sprintName || undefined}
                      icon={<Layers className="h-2.5 w-2.5" />}
                      label={sprintKey}
                    />
                  )}
                  {taskHref && invocation.taskKey && (
                    <ContextChip
                      href={taskHref}
                      title={invocation.taskTitle || undefined}
                      icon={<ListChecks className="h-2.5 w-2.5" />}
                      label={invocation.taskKey}
                    />
                  )}
                </div>
              )}

              {/* Stat table — clean 2-column label/value grid */}
              <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-black/[0.05] bg-black/[0.015] dark:border-white/[0.06] dark:bg-white/[0.02]">
                {cells.map((cell, idx) => {
                  const full = cell.full || (stretchLast && idx === lastIndex);
                  return (
                    <div
                      key={cell.label}
                      className={`flex items-center justify-between gap-3 px-3 py-2
                        ${full ? "col-span-2" : ""}
                        ${!full && idx % 2 === 1 ? "border-l border-black/[0.05] dark:border-white/[0.06]" : ""}
                        ${idx >= 2 ? "border-t border-black/[0.05] dark:border-white/[0.06]" : ""}`}
                    >
                      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                        {cell.label}
                      </span>
                      <span className={`truncate font-mono text-[12px] font-semibold tabular-nums ${cell.tone || "text-slate-700 dark:text-slate-200"}`}>
                        {cell.value}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Invocation id — tiny, bottom-right */}
              <div className="mt-2 text-right font-mono text-[10px] text-slate-300 dark:text-slate-600">
                {invocation.id}
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);
