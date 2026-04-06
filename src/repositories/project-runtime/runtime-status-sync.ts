import { randomUUID } from "crypto";
import { DatabaseAdapter } from "../db/database-adapter.js";
import type { DashboardStatus, Subtask, SubtaskStatus } from "../../contracts/app-types.js";
import { mapRuntimeStatusToPlanningStatus } from "../../services/subtask-state-mapper.js";
import { RuntimeContextStore } from "./runtime-context-store.js";
import {
  RuntimeStatusProjection,
  ProjectStatus,
  TaskRunState,
  TaskRow,
  TaskRunRow,
  ProjectRow,
  SprintRow,
  toNumber
} from "./runtime-status-projection.js";

const TERMINAL_TASK_STATES = new Set<TaskRunState>(["CODING_COMPLETED", "COMPLETED", "FAILED", "BLOCKED"]);

function subtaskSignature(subtask: Subtask): string {
  return JSON.stringify({
    status: subtask.status || "PENDING",
    provider: subtask.provider || null,
    sessionId: subtask.session_id || null,
    sessionName: subtask.session_name || null,
    workerBranch: subtask.worker_branch || null,
    prUrl: subtask.pr_url || null,
    isMerged: Boolean(subtask.is_merged),
    mergeIndicator: subtask.merge_indicator || null,
  });
}

function toPersistedTaskRunState(status: TaskRunState): Exclude<TaskRunState, "CODING_COMPLETED"> {
  return status === "CODING_COMPLETED" ? "COMPLETED" : status;
}

export class RuntimeStatusSync {
  constructor(
    private readonly db: DatabaseAdapter,
    private readonly runtimeContextStore: RuntimeContextStore,
    private readonly runtimeStatusProjection: RuntimeStatusProjection
  ) {}

  syncDashboardStatus(
    status: Partial<DashboardStatus>,
    project: ProjectRow,
    sprint: SprintRow | null
  ): void {
    const tasks = this.runtimeStatusProjection.getMappedTasks(project.id, sprint?.id ?? null);
    const tasksByRecordId = new Map(tasks.map((task) => [task.row.id, task]));
    const tasksByKey = new Map(tasks.map((task) => [task.row.task_key, task]));
    const subtasks = Array.isArray(status.subtasks) ? status.subtasks : [];
    const now = new Date().toISOString();

    this.runInTransaction(() => {
      if (sprint?.id) {
        this.runtimeContextStore.saveRuntimeContext({
          projectId: project.id,
          sprintId: sprint.id,
          sprintNumber: sprint.number === null || sprint.number === undefined
            ? (typeof status.sprint_number === "number" ? status.sprint_number : null)
            : toNumber(sprint.number),
          sourceId: typeof status.source_id === "string" ? status.source_id : null,
          repoPath: typeof status.repo_path === "string" ? status.repo_path : null,
          featureBranch: typeof status.feature_branch === "string" ? status.feature_branch : null,
          reportText: typeof status.reportText === "string" ? status.reportText : "",
          statusTable: typeof status.statusTable === "string" ? status.statusTable : "",
          instructions: typeof status.instructions === "string" ? status.instructions : "",
          timestamp: typeof status.timestamp === "string" ? status.timestamp : now,
        });
        this.runtimeContextStore.clearLegacyProjectRuntimeContext(project.id);
      }

      let hasRunning = false;
      let hasFailure = false;
      let hasIntervention = false;

      for (const subtask of subtasks) {
        const mappedTask = this.runtimeStatusProjection.resolveMappedTask(subtask, tasksByRecordId, tasksByKey);
        if (!mappedTask) {
          continue;
        }

        const runtimeState = subtask.status || "PENDING";
        if (runtimeState === "RUNNING") {
          hasRunning = true;
        } else if (runtimeState === "FAILED") {
          hasFailure = true;
        } else if (runtimeState === "BLOCKED") {
          hasIntervention = true;
        }

        const planningStatus = mapRuntimeStatusToPlanningStatus(runtimeState);
        this.db.prepare(`
          UPDATE tasks
          SET status = COALESCE(?, status),
              is_merged = ?,
              merge_indicator = ?,
              updated_at = ?
          WHERE id = ?
        `).run(
          planningStatus,
          Number(Boolean(subtask.is_merged)),
          subtask.merge_indicator || null,
          now,
          mappedTask.row.id
        );

        this.syncTaskRun(mappedTask.row, subtask, now);
      }

      const projectStatus: ProjectStatus = hasRunning
        ? "running"
        : hasFailure
          ? "failed"
          : hasIntervention
            ? "intervention"
            : "idle";

      this.db.prepare(`
        UPDATE projects
        SET status = ?, updated_at = ?
        WHERE id = ?
      `).run(projectStatus, now, project.id);

      if (sprint?.id) {
        const sprintStatus = hasRunning ? "running" : subtasks.some((task) => task.status === "FAILED") ? "failed" : "idle";
        this.db.prepare(`
          UPDATE sprints
          SET status = ?, updated_at = ?
          WHERE id = ?
        `).run(sprintStatus, now, sprint.id);
      }
    });
  }

  private syncTaskRun(task: TaskRow, subtask: Subtask, now: string): void {
    const runtimeState = subtask.status || "PENDING";
    const persistedRunState = toPersistedTaskRunState(runtimeState);
    const existing = this.findCandidateRun(task.id, subtask);
    const signature = subtaskSignature(subtask);

    if (!existing) {
      if (!this.shouldCreateTaskRun(subtask)) {
        return;
      }

      const runId = randomUUID();
      this.db.prepare(`
        INSERT INTO task_runs (
          id, project_id, sprint_id, task_id, connection_id, provider, mode, session_id, session_name,
          state, worker_branch, pr_url, started_at, finished_at, duration_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        runId,
        task.project_id,
        task.sprint_id,
        task.id,
        null,
        subtask.provider || null,
        "legacy-orchestrator",
        subtask.session_id || null,
        subtask.session_name || null,
        persistedRunState,
        subtask.worker_branch || null,
        subtask.pr_url || null,
        persistedRunState === "PENDING" ? null : now,
        TERMINAL_TASK_STATES.has(runtimeState) ? now : null,
        null
      );
      this.insertRunEvent(runId, "status_sync", {
        signature,
      }, now);
      return;
    }

    const previousSignature = JSON.stringify({
      status: existing.state,
      provider: existing.provider,
      sessionId: existing.session_id,
      sessionName: existing.session_name,
      workerBranch: existing.worker_branch,
      prUrl: existing.pr_url,
      isMerged: Boolean(subtask.is_merged),
      mergeIndicator: subtask.merge_indicator || null,
    });

    const startedAt = existing.started_at || (runtimeState === "PENDING" ? null : now);
    const finishedAt = TERMINAL_TASK_STATES.has(runtimeState)
      ? (existing.finished_at || now)
      : null;

    this.db.prepare(`
      UPDATE task_runs
      SET provider = ?, mode = ?, session_id = ?, session_name = ?, state = ?, worker_branch = ?, pr_url = ?,
          started_at = ?, finished_at = ?, duration_ms = ?
      WHERE id = ?
    `).run(
      subtask.provider || existing.provider || null,
      existing.mode || "legacy-orchestrator",
      subtask.session_id || existing.session_id || null,
      subtask.session_name || existing.session_name || null,
      persistedRunState,
      subtask.worker_branch || null,
      subtask.pr_url || null,
      startedAt,
      finishedAt,
      startedAt && finishedAt ? Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime()) : null,
      existing.id
    );

    if (previousSignature !== signature) {
      this.insertRunEvent(existing.id, "status_sync", {
        previousSignature,
        signature,
      }, now);
    }
  }

  private findCandidateRun(taskId: string, subtask: Subtask): TaskRunRow | null {
    if (typeof subtask.session_id === "string" && subtask.session_id.trim().length > 0) {
      const row = this.db.prepare(`
        SELECT *
        FROM task_runs
        WHERE task_id = ? AND session_id = ?
        ORDER BY rowid DESC
        LIMIT 1
      `).get(taskId, subtask.session_id.trim()) as TaskRunRow | undefined;
      if (row) {
        return row;
      }
    }

    if (typeof subtask.session_name === "string" && subtask.session_name.trim().length > 0) {
      const row = this.db.prepare(`
        SELECT *
        FROM task_runs
        WHERE task_id = ? AND session_name = ?
        ORDER BY rowid DESC
        LIMIT 1
      `).get(taskId, subtask.session_name.trim()) as TaskRunRow | undefined;
      if (row) {
        return row;
      }
    }

    const row = this.db.prepare(`
      SELECT *
      FROM task_runs
      WHERE task_id = ? AND finished_at IS NULL
      ORDER BY rowid DESC
      LIMIT 1
    `).get(taskId) as TaskRunRow | undefined;

    return row || null;
  }

  private shouldCreateTaskRun(subtask: Subtask): boolean {
    return Boolean(
      (subtask.session_id && subtask.session_id.trim().length > 0)
      || (subtask.session_name && subtask.session_name.trim().length > 0)
      || (subtask.provider && subtask.provider.trim().length > 0)
      || (subtask.worker_branch && subtask.worker_branch.trim().length > 0)
      || (subtask.pr_url && subtask.pr_url.trim().length > 0)
      || (subtask.status && subtask.status !== "PENDING")
    );
  }

  private insertRunEvent(taskRunId: string, eventType: string, payload: Record<string, unknown>, createdAt: string): void {
    this.db.prepare(`
      INSERT INTO task_run_events (id, task_run_id, event_type, originator, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      taskRunId,
      eventType,
      "system",
      JSON.stringify(payload),
      createdAt
    );
  }

  private runInTransaction(operation: () => void): void {
    this.db.exec("BEGIN");
    try {
      operation();
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}
