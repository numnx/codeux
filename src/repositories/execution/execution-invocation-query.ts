import { DatabaseAdapter as Database } from "../db/database-adapter.js";
import {
  ExecutionInvocationRecord,
  ExecutionInvocationMessageRecord
} from "../../contracts/invocation-types.js";
import { ProviderInvocationUsageRecord } from "../../contracts/execution-types.js";
import {
  ExecutionInvocationRow,
  ExecutionInvocationMessageRow,
  ProviderInvocationUsageRow
} from "./execution-repository-types.js";
import {
  mapExecutionInvocationRow,
  mapExecutionInvocationMessageRow,
  mapProviderInvocationUsageRow
} from "./execution-read-model-mappers.js";

export function queryExecutionInvocation(
  db: Database,
  id: string
): ExecutionInvocationRecord | null {
  const row = db.prepare(`
    SELECT *
    FROM execution_invocations
    WHERE id = ?
  `).get(id) as ExecutionInvocationRow | undefined;

  if (!row) return null;
  return mapExecutionInvocationRow(row);
}

export function queryExecutionInvocations(
  db: Database,
  params: {
    projectId: string;
    sprintRunId?: string;
    taskRunId?: string;
    limit?: number;
    offset?: number;
  }
): ExecutionInvocationRecord[] {
  const conditions = ["project_id = ?"];
  const values: any[] = [params.projectId];

  if (params.sprintRunId) {
    conditions.push("sprint_run_id = ?");
    values.push(params.sprintRunId);
  }

  if (params.taskRunId) {
    conditions.push("task_run_id = ?");
    values.push(params.taskRunId);
  }

  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;

  const sql = `
    SELECT *
    FROM execution_invocations
    WHERE ${conditions.join(" AND ")}
    ORDER BY started_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(sql).all(...values, limit, offset) as ExecutionInvocationRow[];
  return rows.map(mapExecutionInvocationRow);
}

export function queryExecutionInvocationMessages(
  db: Database,
  invocationId: string
): ExecutionInvocationMessageRecord[] {
  const sql = `
    SELECT *
    FROM execution_invocation_messages
    WHERE invocation_id = ?
    ORDER BY created_at ASC
  `;
  const rows = db.prepare(sql).all(invocationId) as ExecutionInvocationMessageRow[];
  return rows.map(mapExecutionInvocationMessageRow);
}

export function queryProviderInvocationUsage(
  db: Database,
  invocationId: string
): ProviderInvocationUsageRecord | null {
  const row = db.prepare(`
    SELECT *
    FROM provider_invocations
    WHERE id = ?
  `).get(invocationId) as ProviderInvocationUsageRow | undefined;
  return row ? mapProviderInvocationUsageRow(row) : null;
}

export function queryLatestProviderInvocationUsageBySession(
  db: Database,
  sessionId: string,
  purpose?: ProviderInvocationUsageRecord["purpose"],
): ProviderInvocationUsageRecord | null {
  const trimmedSessionId = sessionId.trim();
  if (!trimmedSessionId) {
    return null;
  }

  const row = purpose
    ? db.prepare(`
      SELECT *
      FROM provider_invocations
      WHERE session_id = ?
        AND purpose = ?
      ORDER BY started_at DESC, rowid DESC
      LIMIT 1
    `).get(trimmedSessionId, purpose) as ProviderInvocationUsageRow | undefined
    : db.prepare(`
      SELECT *
      FROM provider_invocations
      WHERE session_id = ?
      ORDER BY started_at DESC, rowid DESC
      LIMIT 1
    `).get(trimmedSessionId) as ProviderInvocationUsageRow | undefined;

  return row ? mapProviderInvocationUsageRow(row) : null;
}
