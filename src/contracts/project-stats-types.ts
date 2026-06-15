import type { ExecutionUsageTotals, ExecutionGitStatsSummary, ExecutionUsageBucketSummary, ExecutionStatsEntitySummary, ExecutionModelStatsSummary, ExecutionInvocationStatusCounts, ExecutionDurationStats } from "./execution-stats-types.js";
import type { TokenUsageSource } from "./execution-types.js";

export type ProjectStatsWindow = "1h" | "24h" | "7d" | "30d" | "all" | "custom";

export type ProjectStatsResolution = "hour" | "day" | "week";

export interface ProjectStatsQuery {
  window: ProjectStatsWindow;
  from?: string | null;
  to?: string | null;
}

export interface ProjectStatsRangeSummary {
  window: ProjectStatsWindow;
  label: string;
  resolution: ProjectStatsResolution;
  resolutionLabel: string;
  from: string;
  to: string;
  bucketCount: number;
  isCustom: boolean;
}

export interface ProjectExecutionStatsChartSeries {
  id: string;
  label: string;
  grouping: string;
  defaultEnabled: boolean;
  data: number[];
  color?: string;
  signalLabel?: string;
  formatter?: 'tokens' | 'duration' | 'number' | 'percent';
}

export interface ProjectExecutionStatsSnapshot {
  projectId: string;
  projectName: string;
  window: ProjectStatsWindow;
  query: ProjectStatsQuery;
  range: ProjectStatsRangeSummary;
  generatedAt: string;
  usage: ExecutionUsageTotals;
  git: ExecutionGitStatsSummary;
  mergeConflictCount?: number;
  activeSprint: {
    sprintId: string;
    sprintName: string;
    sprintNumber: number | null;
  } | null;
  buckets: ExecutionUsageBucketSummary[];
  sprints: ExecutionStatsEntitySummary[];
  tasks: ExecutionStatsEntitySummary[];
  providers: ExecutionStatsEntitySummary[];
  purposes: ExecutionStatsEntitySummary[];
  models: ExecutionModelStatsSummary[];
  statusCounts: ExecutionInvocationStatusCounts;
  duration: ExecutionDurationStats;
  tokenSources: Array<{
    source: TokenUsageSource;
    count: number;
  }>;
  chartSeries: ProjectExecutionStatsChartSeries[];
}
