import type { DatabaseAdapter } from "../db/database-adapter.js";
import type {
  SprintRunRecord,
  TaskDispatchRecord,
  ExecutionLeaseRecord,
  TaskRunRecord,
  ProviderInvocationUsageRecord,
} from "../../contracts/execution-types.js";
import {
  type SprintRunRow,
  type TaskDispatchRow,
  type ExecutionLeaseRow,
  type TaskRunRow,
  type ProviderInvocationUsageRow,
  mapSprintRunRow,
  mapTaskDispatchRow,
  mapExecutionLeaseRow,
  mapTaskRunRow,
  mapProviderInvocationUsageRow,
} from "./execution-row-mappers.js";

export function requireSprintRun(db: DatabaseAdapter, runId: string): SprintRunRecord {
  const row = db.prepare(`
    SELECT *
    FROM sprint_runs
    WHERE id = ?
  `).get(runId) as SprintRunRow | undefined;

  const run = row ? mapSprintRunRow(row) : null;
  if (!run) {
    throw new Error(`Sprint run not found: ${runId}`);
  }
  return run;
}

export function requireTaskDispatch(db: DatabaseAdapter, dispatchId: string): TaskDispatchRecord {
  const row = db.prepare(`
    SELECT *
    FROM task_dispatches
    WHERE id = ?
  `).get(dispatchId) as TaskDispatchRow | undefined;

  const dispatch = row ? mapTaskDispatchRow(row) : null;
  if (!dispatch) {
    throw new Error(`Task dispatch not found: ${dispatchId}`);
  }
  return dispatch;
}

export function requireTaskRun(db: DatabaseAdapter, taskRunId: string): TaskRunRecord {
  const row = db.prepare(`
    SELECT *
    FROM task_runs
    WHERE id = ?
  `).get(taskRunId) as TaskRunRow | undefined;

  const taskRun = row ? mapTaskRunRow(row) : null;
  if (!taskRun) {
    throw new Error(`Task run not found: ${taskRunId}`);
  }
  return taskRun;
}

export function requireProviderInvocationUsage(db: DatabaseAdapter, invocationId: string): ProviderInvocationUsageRecord {
  const row = db.prepare(`
    SELECT *
    FROM provider_invocations
    WHERE id = ?
  `).get(invocationId) as ProviderInvocationUsageRow | undefined;

  const invocation = row ? mapProviderInvocationUsageRow(row) : null;
  if (!invocation) {
    throw new Error(`Provider invocation not found: ${invocationId}`);
  }
  return invocation;
}

export function requireLease(db: DatabaseAdapter, scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string): ExecutionLeaseRecord {
  const row = db.prepare(`
    SELECT *
    FROM execution_leases
    WHERE scope_type = ? AND scope_id = ?
  `).get(scopeType, scopeId) as ExecutionLeaseRow | undefined;

  const lease = row ? mapExecutionLeaseRow(row) : null;
  if (!lease) {
    throw new Error(`Execution lease not found: ${scopeType}:${scopeId}`);
  }
  return lease;
}

export function requireProject(db: DatabaseAdapter, projectId: string): void {
  const row = db.prepare(`SELECT id FROM projects WHERE id = ?`).get(projectId) as { id: string } | undefined;
  if (!row) {
    throw new Error(`Project not found: ${projectId}`);
  }
}

export function requireSprint(db: DatabaseAdapter, sprintId: string, projectId?: string): void {
  const row = db.prepare(`
    SELECT id, project_id
    FROM sprints
    WHERE id = ?
  `).get(sprintId) as { id: string; project_id: string } | undefined;
  if (!row) {
    throw new Error(`Sprint not found: ${sprintId}`);
  }
  if (projectId && row.project_id !== projectId) {
    throw new Error(`Sprint ${sprintId} does not belong to project ${projectId}`);
  }
}

export function requireTask(db: DatabaseAdapter, taskId: string, projectId?: string, sprintId?: string): void {
  const row = db.prepare(`
    SELECT id, project_id, sprint_id
    FROM tasks
    WHERE id = ?
  `).get(taskId) as { id: string; project_id: string; sprint_id: string } | undefined;
  if (!row) {
    throw new Error(`Task not found: ${taskId}`);
  }
  if (projectId && row.project_id !== projectId) {
    throw new Error(`Task ${taskId} does not belong to project ${projectId}`);
  }
  if (sprintId && row.sprint_id !== sprintId) {
    throw new Error(`Task ${taskId} does not belong to sprint ${sprintId}`);
  }
}

export function requireSprintRunScoped(db: DatabaseAdapter, runId: string, projectId: string, sprintId: string): void {
  const run = requireSprintRun(db, runId);
  if (run.projectId !== projectId || run.sprintId !== sprintId) {
    throw new Error(`Sprint run ${runId} does not belong to ${projectId}/${sprintId}`);
  }
}

export function requireConnection(db: DatabaseAdapter, connectionId: string): void {
  const row = db.prepare(`SELECT id FROM mcp_connections WHERE id = ?`).get(connectionId) as { id: string } | undefined;
  if (!row) {
    throw new Error(`Connection not found: ${connectionId}`);
  }
}
