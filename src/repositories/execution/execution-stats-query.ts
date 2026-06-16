import { DatabaseAdapter } from "../db/database-adapter.js";
import { AppDbStorage } from "../app-db-storage.js";
import { toNumber } from "../repository-utils.js";

export interface StatsEntityMetadata {
  label: string;
  secondaryLabel: string | null;
  status: string | null;
  provider: string | null;
  purpose: string | null;
  lastActivityAt: string | null;
}

export function queryWallTimeTotalsByTaskIds(
    storage: AppDbStorage,
    taskWallTimeCache: Map<string, { finishedMs: number, hasActive: boolean }>,
    projectId: string,
    taskIds: string[],
    nowIso: string
): Map<string, number> {
    if (taskIds.length === 0) return new Map();
    const result = new Map<string, number>();
    const missingTaskIds: string[] = [];
    const activeTaskIds: string[] = [];

    for (const taskId of taskIds) {
      if (taskWallTimeCache.has(taskId)) {
        const cache = taskWallTimeCache.get(taskId)!;
        result.set(taskId, cache.finishedMs);
        if (cache.hasActive) {
          activeTaskIds.push(taskId);
        }
      } else {
        missingTaskIds.push(taskId);
      }
    }

    if (missingTaskIds.length > 0) {
      const activeRows = storage.executeChunkedInQuery<{ task_id: string; c: number | string }>({
        sqlPrefix: `SELECT task_id, COUNT(*) as c FROM task_runs WHERE finished_at IS NULL AND started_at IS NOT NULL AND task_id`,
        sqlSuffix: "GROUP BY task_id",
        items: missingTaskIds,
      });
      const activeMap = new Set(activeRows.map(r => r.task_id));

      const finishedRows = storage.executeChunkedInQuery<{ task_id: string; total_duration_ms: number | string }>({
        sqlPrefix: `SELECT task_id, SUM(CASE WHEN duration_ms IS NOT NULL AND duration_ms > 0 THEN duration_ms ELSE 0 END) AS total_duration_ms FROM task_runs WHERE task_id`,
        sqlSuffix: "GROUP BY task_id",
        items: missingTaskIds,
      });
      const finishedMap = new Map(finishedRows.map(r => [r.task_id, Math.max(0, Number(r.total_duration_ms) || 0)]));

      for (const taskId of missingTaskIds) {
        const finishedMs = finishedMap.get(taskId) || 0;
        const hasActive = activeMap.has(taskId);
        taskWallTimeCache.set(taskId, { finishedMs, hasActive });
        result.set(taskId, finishedMs);
        if (hasActive) {
          activeTaskIds.push(taskId);
        }
      }
    }

    if (activeTaskIds.length > 0) {
      const activeTimeRows = storage.executeChunkedInQuery<{ task_id: string; total_duration_ms: number | string }>({
        sqlPrefix: `SELECT task_id, SUM(CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)) AS total_duration_ms FROM task_runs WHERE finished_at IS NULL AND started_at IS NOT NULL AND task_id`,
        sqlSuffix: "GROUP BY task_id",
        items: activeTaskIds,
        bindParamsBefore: [nowIso]
      });
      for (const row of activeTimeRows) {
        result.set(row.task_id, (result.get(row.task_id) || 0) + Math.max(0, Number(row.total_duration_ms) || 0));
      }
    }

    return result;
}

export function queryWallTimeTotalsBySprintRunIds(
    storage: AppDbStorage,
    sprintRunWallTimeCache: Map<string, { finishedMs: number, hasActive: boolean }>,
    projectId: string,
    sprintRunIds: string[],
    nowIso: string
): Map<string, number> {
    if (sprintRunIds.length === 0) return new Map();
    const result = new Map<string, number>();
    const missingIds: string[] = [];
    const activeIds: string[] = [];

    for (const sprintRunId of sprintRunIds) {
      if (sprintRunWallTimeCache.has(sprintRunId)) {
        const cache = sprintRunWallTimeCache.get(sprintRunId)!;
        result.set(sprintRunId, cache.finishedMs);
        if (cache.hasActive) {
          activeIds.push(sprintRunId);
        }
      } else {
        missingIds.push(sprintRunId);
      }
    }

    if (missingIds.length > 0) {
      const activeRows = storage.executeChunkedInQuery<{ sprint_run_id: string; c: number | string }>({
        sqlPrefix: `SELECT sprint_run_id, COUNT(*) as c FROM task_runs WHERE finished_at IS NULL AND started_at IS NOT NULL AND sprint_run_id`,
        sqlSuffix: "GROUP BY sprint_run_id",
        items: missingIds,
      });
      const activeMap = new Set(activeRows.map(r => r.sprint_run_id));

      const finishedRows = storage.executeChunkedInQuery<{ sprint_run_id: string; total_duration_ms: number | string }>({
        sqlPrefix: `SELECT sprint_run_id, SUM(CASE WHEN duration_ms IS NOT NULL AND duration_ms > 0 THEN duration_ms ELSE 0 END) AS total_duration_ms FROM task_runs WHERE sprint_run_id`,
        sqlSuffix: "GROUP BY sprint_run_id",
        items: missingIds,
      });
      const finishedMap = new Map(finishedRows.map(r => [r.sprint_run_id, Math.max(0, Number(r.total_duration_ms) || 0)]));

      for (const sprintRunId of missingIds) {
        const finishedMs = finishedMap.get(sprintRunId) || 0;
        const hasActive = activeMap.has(sprintRunId);
        sprintRunWallTimeCache.set(sprintRunId, { finishedMs, hasActive });
        result.set(sprintRunId, finishedMs);
        if (hasActive) {
          activeIds.push(sprintRunId);
        }
      }
    }

    if (activeIds.length > 0) {
      const activeTimeRows = storage.executeChunkedInQuery<{ sprint_run_id: string; total_duration_ms: number | string }>({
        sqlPrefix: `SELECT sprint_run_id, SUM(CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)) AS total_duration_ms FROM task_runs WHERE finished_at IS NULL AND started_at IS NOT NULL AND sprint_run_id`,
        sqlSuffix: "GROUP BY sprint_run_id",
        items: activeIds,
        bindParamsBefore: [nowIso]
      });
      for (const row of activeTimeRows) {
        result.set(row.sprint_run_id, (result.get(row.sprint_run_id) || 0) + Math.max(0, Number(row.total_duration_ms) || 0));
      }
    }

    return result;
}

export function queryWallTimeTotalsByTaskIdsForRange(db: DatabaseAdapter, projectId: string, rangeStartIso: string, rangeEndIso: string, nowIso: string): Map<string, number> {
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

export function queryWallTimeTotalsBySprintRunIdsForRange(db: DatabaseAdapter, projectId: string, rangeStartIso: string, rangeEndIso: string, nowIso: string): Map<string, number> {
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

export function queryTaskMetadata(db: DatabaseAdapter, projectId: string, ids: string[]): Map<string, StatsEntityMetadata> {
    if (ids.length === 0) {
      return new Map();
    }
    const chunkMap = new Map<string, StatsEntityMetadata>();
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const placeholders = chunk.map(() => "?").join(",");
      const rows = db.prepare(`
        SELECT t.id, t.task_key, t.title, t.status, s.name AS sprint_name
        FROM tasks t
        INNER JOIN sprints s ON s.id = t.sprint_id
        WHERE t.project_id = ? AND t.id IN (${placeholders})
      `).all(projectId, ...chunk) as unknown as Array<{ id: string; task_key: string; title: string; status: string; sprint_name: string }>;
      for (const row of rows) {
        chunkMap.set(row.id, {
          label: `${row.task_key} ${row.title}`.trim(),
          secondaryLabel: row.sprint_name,
          status: row.status,
          provider: null,
          purpose: null,
          lastActivityAt: null,
        });
      }
    }
    return chunkMap;
}

export function querySprintMetadata(db: DatabaseAdapter, projectId: string, ids: string[]): Map<string, StatsEntityMetadata> {
    if (ids.length === 0) {
      return new Map();
    }
    const chunkMap = new Map<string, StatsEntityMetadata>();
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const placeholders = chunk.map(() => "?").join(",");
      const rows = db.prepare(`
        SELECT s.id AS sprint_id, sr.id AS sprint_run_id, s.name, s.number, sr.status
        FROM sprints s
        LEFT JOIN sprint_runs sr ON sr.sprint_id = s.id
        WHERE s.project_id = ? AND (s.id IN (${placeholders}) OR sr.id IN (${placeholders}))
      `).all(projectId, ...chunk, ...chunk) as unknown as Array<{
        sprint_id: string;
        sprint_run_id: string | null;
        name: string;
        number: number | string | null;
        status: string | null;
      }>;

      for (const row of rows) {
        const summary = {
          label: row.number === null ? row.name : `Sprint ${toNumber(row.number)} · ${row.name}`,
          secondaryLabel: null,
          status: row.status,
          provider: null,
          purpose: null,
          lastActivityAt: null,
        } as const;
        chunkMap.set(row.sprint_id, summary);
        if (row.sprint_run_id) {
          chunkMap.set(row.sprint_run_id, summary);
        }
      }
    }
    return chunkMap;
}
