import { DatabaseAdapter as Database } from "../db/database-adapter.js";
import {
  ExecutionInvocationRecord,
  ExecutionInvocationMessageRecord
} from "../../contracts/invocation-types.js";
import {
  ExecutionInvocationRow,
  ExecutionInvocationMessageRow
} from "./execution-repository-types.js";
import {
  mapExecutionInvocationRow,
  mapExecutionInvocationMessageRow
} from "./execution-read-model-mappers.js";
import {
  computeBasicSummary,
  computeP95Duration,
  computeSprintStateSummary,
  computeExternalApiMetrics,
  computeErrorsByCategory,
  computeAvailablePurposes,
  computeAvailableProviders
} from "./execution-invocations-query-analytics.js";


// Shared projection: invocation columns + provider usage + the sprint key /
// task key context the dashboard renders (and links) on each invocation card.
export const INVOCATION_SELECT = `
      execution_invocations.id,
      execution_invocations.project_id,
      COALESCE(execution_invocations.sprint_id, provider_invocations.sprint_id) AS sprint_id,
      COALESCE(execution_invocations.task_id, provider_invocations.task_id) AS task_id,
      COALESCE(execution_invocations.sprint_run_id, provider_invocations.sprint_run_id) AS sprint_run_id,
      COALESCE(execution_invocations.dispatch_id, provider_invocations.dispatch_id) AS dispatch_id,
      COALESCE(execution_invocations.task_run_id, provider_invocations.task_run_id) AS task_run_id,
      COALESCE(execution_invocations.attention_item_id, provider_invocations.attention_item_id) AS attention_item_id,
      execution_invocations.provider_invocation_id,
      execution_invocations.type,
      execution_invocations.status,
      execution_invocations.provider,
      execution_invocations.model,
      execution_invocations.system_prompt,
      execution_invocations.started_at,
      execution_invocations.finished_at,
      execution_invocations.error_message,
      execution_invocations.last_error_category,
      execution_invocations.last_error_message,
      execution_invocations.last_retry_after_iso,
      execution_invocations.message_count,
      execution_invocations.last_message_at,
      execution_invocations.invocation_source,
      execution_invocations.agent_preset_id,
      execution_invocations.created_at,
      execution_invocations.updated_at,
      provider_invocations.input_tokens AS input_tokens,
      provider_invocations.cached_input_tokens AS cached_input_tokens,
      provider_invocations.output_tokens AS output_tokens,
      provider_invocations.total_tokens AS total_tokens,
      sprints.number AS sprint_number,
      sprints.name AS sprint_name,
      sprints.slug AS sprint_slug,
      tasks.task_key AS task_key,
      tasks.title AS task_title`;

export const INVOCATION_JOINS = `
    LEFT JOIN provider_invocations ON execution_invocations.provider_invocation_id = provider_invocations.id
    LEFT JOIN sprints ON COALESCE(execution_invocations.sprint_id, provider_invocations.sprint_id) = sprints.id
    LEFT JOIN tasks ON COALESCE(execution_invocations.task_id, provider_invocations.task_id) = tasks.id`;

export function queryExecutionInvocations(
  db: Database,
  params: {
    projectId: string;
    sprintId?: string;
    sprintRunId?: string;
    sprintRunIds?: string[];
    taskRunId?: string;
    limit?: number | null;
    offset?: number;
  }
): ExecutionInvocationRecord[] {
  const conditions = ["execution_invocations.project_id = ?"];
  const values: any[] = [params.projectId];

  if (params.sprintId) {
    conditions.push("COALESCE(execution_invocations.sprint_id, provider_invocations.sprint_id) = ?");
    values.push(params.sprintId);
  }

  if (params.sprintRunId) {
    conditions.push("COALESCE(execution_invocations.sprint_run_id, provider_invocations.sprint_run_id) = ?");
    values.push(params.sprintRunId);
  }

  if (params.sprintRunIds && params.sprintRunIds.length > 0) {
    conditions.push(`COALESCE(execution_invocations.sprint_run_id, provider_invocations.sprint_run_id) IN (${params.sprintRunIds.map(() => "?").join(", ")})`);
    values.push(...params.sprintRunIds);
  }

  if (params.taskRunId) {
    conditions.push("COALESCE(execution_invocations.task_run_id, provider_invocations.task_run_id) = ?");
    values.push(params.taskRunId);
  }

  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;
  const limitClause = params.limit === null ? "LIMIT -1 OFFSET ?" : "LIMIT ? OFFSET ?";
  const paginationValues = params.limit === null ? [offset] : [limit, offset];

  const sql = `
    SELECT${INVOCATION_SELECT}
    FROM execution_invocations${INVOCATION_JOINS}
    WHERE ${conditions.join(" AND ")}
    ORDER BY execution_invocations.started_at DESC, execution_invocations.rowid DESC
    ${limitClause}
  `;

  const rows = db.prepare(sql).all(...values, ...paginationValues) as ExecutionInvocationRow[];
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

export function queryExecutionInvocationsByProviderInvocationId(
  db: Database,
  providerInvocationId: string,
): ExecutionInvocationRecord[] {
  const rows = db.prepare(`
    SELECT${INVOCATION_SELECT}
    FROM execution_invocations${INVOCATION_JOINS}
    WHERE execution_invocations.provider_invocation_id = ?
    ORDER BY execution_invocations.started_at DESC, execution_invocations.rowid DESC
  `).all(providerInvocationId) as ExecutionInvocationRow[];

  return rows.map(mapExecutionInvocationRow);
}

export function queryRunningRetryExecutionInvocations(db: Database): ExecutionInvocationRecord[] {
  const rows = db.prepare(`
    SELECT${INVOCATION_SELECT}
    FROM execution_invocations${INVOCATION_JOINS}
    WHERE execution_invocations.status = 'running'
      AND execution_invocations.last_retry_after_iso IS NOT NULL
      AND execution_invocations.last_error_category IN ('QUOTA_EXHAUSTED', 'RATE_LIMITED')
    ORDER BY execution_invocations.started_at ASC, execution_invocations.rowid ASC
  `).all() as ExecutionInvocationRow[];

  return rows.map(mapExecutionInvocationRow);
}

export function queryActiveExecutionInvocationsByTypes(
  db: Database,
  types: string[],
): ExecutionInvocationRecord[] {
  if (types.length === 0) {
    return [];
  }

  const rows = db.prepare(`
    SELECT${INVOCATION_SELECT}
    FROM execution_invocations${INVOCATION_JOINS}
    WHERE execution_invocations.status IN ('running', 'paused')
      AND execution_invocations.type IN (${types.map(() => "?").join(", ")})
    ORDER BY execution_invocations.started_at DESC, execution_invocations.rowid DESC
  `).all(...types) as ExecutionInvocationRow[];

  return rows.map(mapExecutionInvocationRow);
}

