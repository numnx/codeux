import type { GitTrackingStatus, JulesActivity, Subtask } from "../contracts/app-types.js";
import type { Logger } from "../shared/logging/logger.js";

export interface ActivityCacheServiceDependencies {
  getSubtasks: (projectId: string, sprintId: string) => Subtask[];
  resolveSessionNameFromTask: (task: Subtask) => string | undefined;
  fetchRecentActivities: (sessionName: string, pageSize?: number) => Promise<JulesActivity[]>;
  resolveGitStatusRepoPath: (projectId?: string, sprintId?: string) => string;
  fetchGitStatusForRepo: (repoPath: string, cacheTtlMs?: number, projectId?: string, sprintId?: string) => Promise<GitTrackingStatus>;
  invalidateGitStatusCache?: (repoPath: string) => void;
  logger?: Logger;
}

export class ActivityCacheService {
  private liveActivitiesCache = new Map<string, { timestamp: number; data: Record<string, JulesActivity[]> }>();
  private liveActivitiesFetchPromise = new Map<string, Promise<Record<string, JulesActivity[]>> | null>();

  constructor(
    private readonly deps: ActivityCacheServiceDependencies,
    private readonly liveActivityCacheMs: number,
    private readonly gitStatusCacheMs: number,
    private readonly activityPageSize: number
  ) {}

  invalidateGitStatusCache(projectId: string = "default", sprintId: string = "default"): void {
    this.deps.invalidateGitStatusCache?.(this.deps.resolveGitStatusRepoPath(projectId, sprintId));
  }

  invalidateLiveActivitiesCache(projectId: string = "default", sprintId: string = "default"): void {
    const key = `${projectId}:${sprintId}`;
    this.liveActivitiesCache.delete(key);
    this.liveActivitiesFetchPromise.delete(key);
  }

  async getGitStatus(projectId?: string, sprintId?: string): Promise<GitTrackingStatus> {
    return this.deps.fetchGitStatusForRepo(this.deps.resolveGitStatusRepoPath(projectId, sprintId), this.gitStatusCacheMs, projectId, sprintId);
  }

  async getLiveActivitiesForActiveTasks(projectId: string = "default", sprintId: string = "default"): Promise<Record<string, JulesActivity[]>> {
    const key = `${projectId}:${sprintId}`;
    const now = Date.now();
    const cacheEntry = this.liveActivitiesCache.get(key);

    if (cacheEntry && now - cacheEntry.timestamp < this.liveActivityCacheMs) {
      return cacheEntry.data;
    }

    const fetchPromise = this.liveActivitiesFetchPromise.get(key);
    if (fetchPromise) {
      return fetchPromise;
    }

    const newFetchPromise = (async () => {
      const subtasks = this.deps.getSubtasks(projectId, sprintId);
      const activeSessionNames = Array.from(
        new Set(
          subtasks
            .filter((task) => task.status === "RUNNING")
            .map((task) => this.deps.resolveSessionNameFromTask(task))
            .filter((value): value is string => Boolean(value))
        )
      );

      if (activeSessionNames.length === 0) {
        const empty: Record<string, JulesActivity[]> = {};
        this.liveActivitiesCache.set(key, { timestamp: Date.now(), data: empty });
        return empty;
      }

      const results = await Promise.all(
        activeSessionNames.map(async (sessionName) => {
          try {
            const activities = await this.deps.fetchRecentActivities(sessionName, this.activityPageSize);
            return [sessionName, activities] as const;
          } catch {
            this.deps.logger?.warn("Could not fetch live activities", { sessionName });
            return [sessionName, []] as const;
          }
        })
      );

      const data = Object.fromEntries(results);
      this.liveActivitiesCache.set(key, { timestamp: Date.now(), data });
      return data;
    })().finally(() => {
      this.liveActivitiesFetchPromise.delete(key);
    });

    this.liveActivitiesFetchPromise.set(key, newFetchPromise);
    return newFetchPromise;
  }
}
