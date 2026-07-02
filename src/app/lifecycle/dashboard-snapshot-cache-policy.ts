import type { ProjectExecutionSnapshotOptions } from "../../repositories/execution/project-execution-snapshot-query.js";
import type { ProjectStatsQuery } from "../../contracts/app-types.js";

/**
 * Snapshots returned by the cache are considered immutable by callers.
 * Cache reads do not mutate cached snapshots.
 */
export class DashboardSnapshotCachePolicy {
  static readonly PROJECT_EXECUTION_CACHE_TTL_MS = 2_000;
  static readonly PROJECT_STATS_CACHE_TTL_MS = 2_000;
  static readonly OVERVIEW_CACHE_TTL_MS = 500;
  static readonly PROJECTS_CACHE_TTL_MS = 500;

  static readonly MAX_PROJECT_EXECUTION_SNAPSHOTS = 50;
  static readonly MAX_PROJECT_STATS_SNAPSHOTS = 50;

  static getProjectExecutionCacheKey(projectId: string, options: ProjectExecutionSnapshotOptions = {}): string {
    return `${projectId}:${options.selectedSprintId || ""}:feed=${options.includeFeeds !== false}`;
  }

  static isProjectExecutionCacheKeyMatch(key: string, projectId: string): boolean {
    return key === projectId || key.startsWith(`${projectId}:`);
  }

  static getProjectStatsCacheKey(projectId: string, query: ProjectStatsQuery): string {
    return `${projectId}:${JSON.stringify(query)}`;
  }

  static isProjectStatsCacheKeyMatch(key: string, projectId: string): boolean {
    return key.startsWith(`${projectId}:`);
  }
}
