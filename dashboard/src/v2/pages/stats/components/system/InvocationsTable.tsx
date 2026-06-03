import type { FunctionComponent, ComponentType, JSX } from "preact";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MinusCircle,
  PauseCircle,
  XCircle,
} from "lucide-preact";
import type { ExecutionInvocationRecord } from "../../../../types.js";
import { formatDateTime, formatDuration, formatTokens } from "../../stats-utils.js";
import {
  CHIP_CLASS,
  LEDGER_ROW_MODERN_CLASS,
  PANEL_CLASS,
  SUBPANEL_CLASS,
  getProviderIcon,
} from "../StatsShared.js";
import type { SystemSort, SystemSortKey } from "../../hooks/use-system-view-data.js";

export interface InvocationsTableProps {
  invocations: ExecutionInvocationRecord[];
  sort: SystemSort;
  onSortChange: (sort: SystemSort) => void;
  expandedId: string | null;
  onRowExpand: (id: string | null) => void;
  loading?: boolean;
}

type StatusTone = {
  label: string;
  containerClassName: string;
  iconClassName: string;
  icon: ComponentType<any>;
};

const STATUS_STYLES: Record<ExecutionInvocationRecord["status"], StatusTone> = {
  running: {
    label: "Running",
    containerClassName: "border-blue-500/15 bg-blue-500/10 text-blue-300 dark:text-blue-300",
    iconClassName: "text-blue-400",
    icon: Loader2,
  },
  completed: {
    label: "Completed",
    containerClassName: "border-emerald-500/15 bg-emerald-500/10 text-emerald-300 dark:text-emerald-300",
    iconClassName: "text-emerald-400",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    containerClassName: "border-red-500/15 bg-red-500/10 text-red-300 dark:text-red-300",
    iconClassName: "text-red-400",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    containerClassName: "border-slate-500/15 bg-slate-500/10 text-slate-300 dark:text-slate-300",
    iconClassName: "text-slate-400",
    icon: MinusCircle,
  },
  paused: {
    label: "Paused",
    containerClassName: "border-amber-500/15 bg-amber-500/10 text-amber-300 dark:text-amber-300",
    iconClassName: "text-amber-400",
    icon: PauseCircle,
  },
};

function formatDurationFromInvocation(invocation: ExecutionInvocationRecord): string {
  if (invocation.finishedAt === null) {
    return "running";
  }

  const startedAt = Date.parse(invocation.startedAt);
  const finishedAt = Date.parse(invocation.finishedAt);

  if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt)) {
    return "—";
  }

  return formatDuration(finishedAt - startedAt);
}

function getSortDirectionIcon(sort: SystemSort, key: SystemSortKey): ComponentType<any> {
  if (sort.key !== key) {
    return ArrowUpDown;
  }

  return sort.dir === "asc" ? ArrowUp : ArrowDown;
}

function toggleSort(sort: SystemSort, key: SystemSortKey, onSortChange: (nextSort: SystemSort) => void): void {
  onSortChange({
    key,
    dir: sort.key === key ? (sort.dir === "desc" ? "asc" : "desc") : "desc",
  });
}

function hasContext(invocation: ExecutionInvocationRecord): boolean {
  return (
    (invocation.sprintNumber !== null && invocation.sprintNumber !== undefined)
    || (invocation.taskKey !== null && invocation.taskKey !== undefined)
  );
}

function renderContextChips(invocation: ExecutionInvocationRecord): JSX.Element | null {
  if (!hasContext(invocation)) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {invocation.sprintNumber !== null && invocation.sprintNumber !== undefined ? (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300 ${CHIP_CLASS}`}>
          S{invocation.sprintNumber}
        </span>
      ) : null}
      {invocation.taskKey !== null && invocation.taskKey !== undefined ? (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300 ${CHIP_CLASS}`}>
          {invocation.taskKey}
        </span>
      ) : null}
    </div>
  );
}

function renderLoadingRow(index: number): JSX.Element {
  return (
    <div key={`loading-${index}`} className={`${LEDGER_ROW_MODERN_CLASS} animate-pulse`}>
      <div className="grid min-w-[1220px] grid-cols-[8.5rem_9.5rem_7rem_14rem_6rem_6rem_6.5rem_7rem_8rem_10rem_3rem] items-center gap-4">
        <div className="h-4 w-24 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="h-8 w-28 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="h-7 w-20 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="h-5 w-40 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="h-4 w-14 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="h-4 w-14 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="h-4 w-16 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="h-4 w-16 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="h-4 w-20 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="h-8 w-28 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="h-10 w-10 rounded-full bg-slate-200/80 dark:bg-white/10" />
      </div>
    </div>
  );
}

function renderHeaderButton(
  sort: SystemSort,
  key: SystemSortKey,
  label: string,
  onSortChange: (sort: SystemSort) => void,
): JSX.Element {
  const Icon = getSortDirectionIcon(sort, key);

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-200"
      onClick={() => toggleSort(sort, key, onSortChange)}
      aria-label={`Sort by ${label}`}
      aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

function renderStatusChip(invocation: ExecutionInvocationRecord): JSX.Element {
  const status = STATUS_STYLES[invocation.status];
  const Icon = status.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${status.containerClassName}`}>
      <Icon className={`h-3.5 w-3.5 ${status.iconClassName}`} strokeWidth={2.25} />
      {status.label}
    </div>
  );
}

function renderInvocationRow(
  invocation: ExecutionInvocationRecord,
  expandedId: string | null,
  onRowExpand: (id: string | null) => void,
): JSX.Element {
  const isExpanded = expandedId === invocation.id;
  const provider = getProviderIcon(invocation.provider);
  const ProviderIcon = provider.icon;
  const failedError = invocation.status === "failed" ? invocation.lastErrorMessage || invocation.errorMessage : null;

  return (
    <>
      <tr key={invocation.id}>
        <td colSpan={11} className="px-0">
          <div className={`${LEDGER_ROW_MODERN_CLASS} overflow-visible`}>
            <div className="grid min-w-[1220px] grid-cols-[8.5rem_9.5rem_7rem_14rem_6rem_6rem_6.5rem_7rem_8rem_10rem_3rem] items-start gap-4">
              <div className="pt-0.5 text-[11px] font-mono text-slate-400">
                {formatDateTime(invocation.startedAt)}
              </div>

              <div className="flex flex-col gap-1">
                {renderStatusChip(invocation)}
                {failedError ? (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="min-w-0 break-words">{failedError}</span>
                  </div>
                ) : null}
              </div>

              <div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300 ${CHIP_CLASS}`}>
                  {invocation.type?.replace(/_/g, " ") || "unknown"}
                </span>
              </div>

              <div className="flex min-w-0 items-start gap-2 text-[11px]">
                <div className={`mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-xl ${provider.bg} ${provider.text}`}>
                  <ProviderIcon className="h-3.5 w-3.5" strokeWidth={2.1} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-medium text-slate-900 dark:text-white">
                    {invocation.model || "—"}
                  </div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {invocation.provider || "unknown"}
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] font-medium text-blue-400">
                {formatTokens(invocation.inputTokens ?? 0)}
              </div>
              <div className="text-right text-[11px] font-medium text-emerald-400">
                {formatTokens(invocation.outputTokens ?? 0)}
              </div>
              <div className="text-right text-[11px] font-medium text-purple-400">
                {formatTokens(invocation.cachedInputTokens ?? 0)}
              </div>
              <div className="text-right text-[11px] font-bold text-white">
                {formatTokens(invocation.totalTokens ?? 0)}
              </div>
              <div className="text-right text-[11px] font-medium text-slate-200">
                {formatDurationFromInvocation(invocation)}
              </div>
              <div className="flex min-w-0 items-start justify-end">
                {renderContextChips(invocation)}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-signal-500/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/60"
                  onClick={() => onRowExpand(isExpanded ? null : invocation.id)}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} invocation ${invocation.id}`}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </td>
      </tr>
      {isExpanded ? (
        <tr key={`${invocation.id}-detail`}>
          <td colSpan={11} className="px-0 pt-0">
            <div className="rounded-2xl bg-slate-950/60 border border-white/[0.05] p-4 mt-1 text-sm text-slate-400">
              Messages panel — wired in T06 ({invocation.id})
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export const InvocationsTable: FunctionComponent<InvocationsTableProps> = ({
  invocations,
  sort,
  onSortChange,
  expandedId,
  onRowExpand,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className={`${PANEL_CLASS} max-h-[42rem] overflow-auto`}>
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_value, index) => renderLoadingRow(index))}
        </div>
      </div>
    );
  }

  if (invocations.length === 0) {
    return (
      <div className={`${PANEL_CLASS} flex min-h-[22rem] items-center justify-center overflow-hidden`}>
        <div className={`${SUBPANEL_CLASS} flex max-w-md flex-col items-center gap-3 px-8 py-10 text-center`}>
          <AlertTriangle className="h-6 w-6 text-amber-400" />
          <div className="text-sm font-medium text-slate-300">
            No invocations match the current filters
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${PANEL_CLASS} max-h-[42rem] overflow-auto`}>
      <table className="w-full border-separate border-spacing-y-2">
        <thead className="sticky top-0 z-10">
          <tr className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            <th scope="col" className="sticky top-0 z-10 bg-white/80 px-4 pb-2 text-left backdrop-blur-sm dark:bg-void-800/80">
              {renderHeaderButton(sort, "startedAt", "Time", onSortChange)}
            </th>
            <th scope="col" className="sticky top-0 z-10 bg-white/80 px-4 pb-2 text-left backdrop-blur-sm dark:bg-void-800/80">
              Status
            </th>
            <th scope="col" className="sticky top-0 z-10 bg-white/80 px-4 pb-2 text-left backdrop-blur-sm dark:bg-void-800/80">
              Type
            </th>
            <th scope="col" className="sticky top-0 z-10 bg-white/80 px-4 pb-2 text-left backdrop-blur-sm dark:bg-void-800/80">
              Model
            </th>
            <th scope="col" className="sticky top-0 z-10 bg-white/80 px-4 pb-2 text-right backdrop-blur-sm dark:bg-void-800/80">
              {renderHeaderButton(sort, "inputTokens", "In", onSortChange)}
            </th>
            <th scope="col" className="sticky top-0 z-10 bg-white/80 px-4 pb-2 text-right backdrop-blur-sm dark:bg-void-800/80">
              {renderHeaderButton(sort, "outputTokens", "Out", onSortChange)}
            </th>
            <th scope="col" className="sticky top-0 z-10 bg-white/80 px-4 pb-2 text-right backdrop-blur-sm dark:bg-void-800/80">
              Cached
            </th>
            <th scope="col" className="sticky top-0 z-10 bg-white/80 px-4 pb-2 text-right backdrop-blur-sm dark:bg-void-800/80">
              {renderHeaderButton(sort, "totalTokens", "Total", onSortChange)}
            </th>
            <th scope="col" className="sticky top-0 z-10 bg-white/80 px-4 pb-2 text-right backdrop-blur-sm dark:bg-void-800/80">
              {renderHeaderButton(sort, "durationMs", "Duration", onSortChange)}
            </th>
            <th scope="col" className="sticky top-0 z-10 bg-white/80 px-4 pb-2 text-left backdrop-blur-sm dark:bg-void-800/80">
              Context
            </th>
            <th scope="col" className="sticky top-0 z-10 bg-white/80 px-4 pb-2 text-right backdrop-blur-sm dark:bg-void-800/80">
              <span className="sr-only">Expand</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {invocations.map((invocation) => renderInvocationRow(invocation, expandedId, onRowExpand))}
        </tbody>
      </table>
    </div>
  );
};
