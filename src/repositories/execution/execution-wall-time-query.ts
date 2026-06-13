import { DatabaseAdapter as Database } from "../db/database-adapter.js";
import { AppDbStorage } from "../app-db-storage.js";
import { toNumber } from "./execution-utils.js";

export interface WallTimeCacheEntry {
  finishedMs: number;
  hasActive: boolean;
}

export function buildWallTimeCacheKey(projectId: string, id: string): string {
  return `${projectId}:${id}`;
}

/**
 * Common helper for calculating wall-time totals with caching for finished durations.
 * Active task runs always add live elapsed time on top of the cached finished totals.
 */
export function getWallTimeTotalsWithCache(
  storage: AppDbStorage,
  projectId: string,
  ids: string[],
  cache: Map<string, WallTimeCacheEntry>,
  idColumn: "task_id" | "sprint_run_id",
  nowIso: string,
): Map<string, number> {
  if (ids.length === 0) return new Map();
  const result = new Map<string, number>();
  const missingIds: string[] = [];
  const activeIds: string[] = [];

  for (const id of ids) {
    const key = buildWallTimeCacheKey(projectId, id);
    if (cache.has(key)) {
      const entry = cache.get(key)!;
      result.set(id, entry.finishedMs);
      if (entry.hasActive) {
        activeIds.push(id);
      }
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length > 0) {
    // 1. Identify which ones have active runs
    const activeRows = storage.executeChunkedInQuery<{ id: string }>({
      sqlPrefix: `SELECT ${idColumn} as id FROM task_runs WHERE finished_at IS NULL AND started_at IS NOT NULL AND ${idColumn}`,
      sqlSuffix: `GROUP BY ${idColumn}`,
      items: missingIds,
    });
    const activeSet = new Set(activeRows.map((r) => r.id));

    // 2. Sum finished durations
    const finishedRows = storage.executeChunkedInQuery<{ id: string; total_duration_ms: number | string }>({
      sqlPrefix: `SELECT ${idColumn} as id, SUM(CASE WHEN duration_ms IS NOT NULL AND duration_ms > 0 THEN duration_ms ELSE 0 END) AS total_duration_ms FROM task_runs WHERE ${idColumn}`,
      sqlSuffix: `GROUP BY ${idColumn}`,
      items: missingIds,
    });
    const finishedMap = new Map(finishedRows.map((r) => [r.id, Math.max(0, toNumber(r.total_duration_ms))]));

    for (const id of missingIds) {
      const finishedMs = finishedMap.get(id) || 0;
      const hasActive = activeSet.has(id);
      cache.set(buildWallTimeCacheKey(projectId, id), { finishedMs, hasActive });
      result.set(id, finishedMs);
      if (hasActive) {
        activeIds.push(id);
      }
    }
  }

  if (activeIds.length > 0) {
    const activeTimeRows = storage.executeChunkedInQuery<{ id: string; total_duration_ms: number | string }>({
      sqlPrefix: `SELECT ${idColumn} as id, SUM(CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)) AS total_duration_ms FROM task_runs WHERE finished_at IS NULL AND started_at IS NOT NULL AND ${idColumn}`,
      sqlSuffix: `GROUP BY ${idColumn}`,
      items: activeIds,
      bindParamsBefore: [nowIso],
    });
    for (const row of activeTimeRows) {
      result.set(row.id, (result.get(row.id) || 0) + Math.max(0, toNumber(row.total_duration_ms)));
    }
  }

  return result;
}

export function getWallTimeTotalsByTaskIds(storage: AppDbStorage, taskIds: string[], nowIso: string): Map<string, number> {
  if (taskIds.length === 0) {
    return new Map();
  }
  const rows = storage.executeChunkedInQuery<{ task_id: string; total_duration_ms: number | string }>({
    sqlPrefix: `
    SELECT
      task_id,
      SUM(
        CASE
          WHEN duration_ms IS NOT NULL AND duration_ms > 0 THEN duration_ms
          WHEN started_at IS NOT NULL AND finished_at IS NULL THEN CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)
          ELSE 0
        END
      ) AS total_duration_ms
    FROM task_runs
    WHERE task_id`,
    sqlSuffix: "GROUP BY task_id",
    items: taskIds,
    bindParamsBefore: [nowIso],
  });
  return new Map(rows.map((row) => [row.task_id, Math.max(0, toNumber(row.total_duration_ms))] as const));
}

export function getWallTimeTotalsBySprintRunIds(storage: AppDbStorage, sprintRunIds: string[], nowIso: string): Map<string, number> {
  if (sprintRunIds.length === 0) {
    return new Map();
  }
  const rows = storage.executeChunkedInQuery<{ sprint_run_id: string; total_duration_ms: number | string }>({
    sqlPrefix: `
    SELECT
      sprint_run_id,
      SUM(
        CASE
          WHEN duration_ms IS NOT NULL AND duration_ms > 0 THEN duration_ms
          WHEN started_at IS NOT NULL AND finished_at IS NULL THEN CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)
          ELSE 0
        END
      ) AS total_duration_ms
    FROM task_runs
    WHERE sprint_run_id`,
    sqlSuffix: "GROUP BY sprint_run_id",
    items: sprintRunIds,
    bindParamsBefore: [nowIso],
  });
  return new Map(rows.map((row) => [row.sprint_run_id, Math.max(0, toNumber(row.total_duration_ms))] as const));
}

export function getWallTimeTotalsByTaskIdsForRange(db: Database, projectId: string, rangeStartIso: string, rangeEndIso: string, nowIso: string): Map<string, number> {
  const rows = db.prepare(`
    SELECT
      task_id,
      SUM(
        CASE
          WHEN duration_ms IS NOT NULL AND duration_ms > 0 THEN duration_ms
          WHEN started_at IS NOT NULL AND finished_at IS NULL THEN CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)
          ELSE 0
        END
      ) AS total_duration_ms
    FROM task_runs
    WHERE project_id = ?
      AND task_id IS NOT NULL
      AND COALESCE(finished_at, started_at) >= ?
      AND COALESCE(finished_at, started_at) < ?
    GROUP BY task_id
  `).all(nowIso, projectId, rangeStartIso, rangeEndIso) as unknown as Array<{ task_id: string; total_duration_ms: number | string }>;

  return new Map(rows.map((row) => [row.task_id, Math.max(0, toNumber(row.total_duration_ms))] as const));
}

export function getWallTimeTotalsBySprintRunIdsForRange(db: Database, projectId: string, rangeStartIso: string, rangeEndIso: string, nowIso: string): Map<string, number> {
  const rows = db.prepare(`
    SELECT
      sprint_run_id,
      SUM(
        CASE
          WHEN duration_ms IS NOT NULL AND duration_ms > 0 THEN duration_ms
          WHEN started_at IS NOT NULL AND finished_at IS NULL THEN CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)
          ELSE 0
        END
      ) AS total_duration_ms
    FROM task_runs
    WHERE project_id = ?
      AND sprint_run_id IS NOT NULL
      AND COALESCE(finished_at, started_at) >= ?
      AND COALESCE(finished_at, started_at) < ?
    GROUP BY sprint_run_id
  `).all(nowIso, projectId, rangeStartIso, rangeEndIso) as unknown as Array<{ sprint_run_id: string; total_duration_ms: number | string }>;

  return new Map(rows.map((row) => [row.sprint_run_id, Math.max(0, toNumber(row.total_duration_ms))] as const));
}
