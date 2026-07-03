import { DatabaseAdapter as Database } from "../db/database-adapter.js";
import {
  ExecutionInvocationRecord,
} from "../../contracts/invocation-types.js";
import {
  ExecutionInvocationRow,
} from "./execution-repository-types.js";
import {
  mapExecutionInvocationRow,
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
import { INVOCATION_JOINS, INVOCATION_SELECT } from "./execution-invocations-query.js";

export interface InvocationQueryPlan {
  readonly conditions: readonly string[];
  readonly values: readonly any[];
  readonly orderBy: string;
  readonly limit: number;
  readonly offset: number;
}

export function buildInvocationQueryPlan(
  params: import("../../contracts/invocation-types.js").ProjectInvocationsQuery & { projectId: string }
): InvocationQueryPlan {
  const conditions: string[] = ["execution_invocations.project_id = ?"];
  const values: any[] = [params.projectId];

  if (params.status) {
    if (Array.isArray(params.status) && params.status.length > 0) {
      conditions.push(`execution_invocations.status IN (${params.status.map(() => "?").join(", ")})`);
      values.push(...params.status);
    } else if (typeof params.status === 'string') {
      conditions.push("execution_invocations.status = ?");
      values.push(params.status);
    }
  }

  if (params.provider) {
    if (Array.isArray(params.provider) && params.provider.length > 0) {
      conditions.push(`execution_invocations.provider IN (${params.provider.map(() => "?").join(", ")})`);
      values.push(...params.provider);
    } else if (typeof params.provider === 'string') {
      conditions.push("execution_invocations.provider = ?");
      values.push(params.provider);
    }
  }

  if (params.purpose) {
    if (Array.isArray(params.purpose) && params.purpose.length > 0) {
      conditions.push(`provider_invocations.purpose IN (${params.purpose.map(() => "?").join(", ")})`);
      values.push(...params.purpose);
    } else if (typeof params.purpose === 'string') {
      conditions.push("provider_invocations.purpose = ?");
      values.push(params.purpose);
    }
  }

  if (params.search) {
    conditions.push("(sprints.name LIKE ? OR sprints.slug LIKE ? OR tasks.task_key LIKE ? OR tasks.title LIKE ? OR execution_invocations.model LIKE ?)");
    const searchTerm = `%${params.search}%`;
    values.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (params.errorCategories && params.errorCategories.length > 0) {
    const errorConditions: string[] = [];
    for (const cat of params.errorCategories) {
      if (cat === "timeout") errorConditions.push("LOWER(execution_invocations.last_error_message) LIKE '%timeout%'");
      else if (cat === "rateLimit") errorConditions.push("(LOWER(execution_invocations.last_error_message) LIKE '%rate%' OR LOWER(execution_invocations.last_error_message) LIKE '%429%')");
      else if (cat === "modelError") errorConditions.push("LOWER(execution_invocations.last_error_message) LIKE '%model%'");
      else if (cat === "apiError") errorConditions.push("(LOWER(execution_invocations.last_error_message) LIKE '%api%' OR LOWER(execution_invocations.last_error_message) LIKE '%http%')");
      else if (cat === "cancelled") errorConditions.push("(LOWER(execution_invocations.last_error_message) LIKE '%cancel%' OR execution_invocations.status = 'cancelled')");
    }
    if (errorConditions.length > 0) {
      conditions.push(`(${errorConditions.join(" OR ")})`);
    }
  }

  const sortKeyMap: Record<string, string> = {
    startedAt: "execution_invocations.started_at",
    durationMs: "provider_invocations.duration_ms",
    totalTokens: "provider_invocations.total_tokens",
  };

  let orderBy = "ORDER BY execution_invocations.started_at DESC, execution_invocations.rowid DESC";
  if (params.sortKey && sortKeyMap[params.sortKey]) {
    const dir = params.sortDir === "asc" ? "ASC" : "DESC";
    orderBy = `ORDER BY ${sortKeyMap[params.sortKey]} ${dir}, execution_invocations.rowid DESC`;
  }

  return {
    conditions,
    values,
    orderBy,
    limit: params.limit ?? 100,
    offset: params.offset ?? 0,
  };
}

export function computeTotalCount(db: Database, plan: InvocationQueryPlan): number {
  const countSql = `
    SELECT COUNT(*) as count
    FROM execution_invocations${INVOCATION_JOINS}
    WHERE ${plan.conditions.join(" AND ")}
  `;
  const result = db.prepare(countSql).get(...plan.values) as { count: number };
  return result.count;
}

export function computePageItems(db: Database, plan: InvocationQueryPlan): ExecutionInvocationRecord[] {
  const sql = `
    SELECT${INVOCATION_SELECT}
    FROM execution_invocations${INVOCATION_JOINS}
    WHERE ${plan.conditions.join(" AND ")}
    ${plan.orderBy}
    LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(sql).all(...plan.values, plan.limit, plan.offset) as ExecutionInvocationRow[];
  return rows.map(mapExecutionInvocationRow);
}

export function queryProjectInvocations(
  db: import("../db/database-adapter.js").DatabaseAdapter,
  params: import("../../contracts/invocation-types.js").ProjectInvocationsQuery & { projectId: string }
): import("../../contracts/invocation-types.js").ProjectInvocationsQueryResult {
  const plan = buildInvocationQueryPlan(params);

  const totalCount = computeTotalCount(db, plan);

  const summaryRow = computeBasicSummary(db, plan.conditions, plan.values, INVOCATION_JOINS);
  const p95DurationMs = computeP95Duration(db, plan.conditions, plan.values, INVOCATION_JOINS);
  const sprintStateSummary = computeSprintStateSummary(db, plan.conditions, plan.values, INVOCATION_JOINS);
  const externalApiMetrics = computeExternalApiMetrics(db, plan.conditions, plan.values, INVOCATION_JOINS);
  const errorsByCategory = computeErrorsByCategory(db, plan.conditions, plan.values, INVOCATION_JOINS);
  const availablePurposes = computeAvailablePurposes(db, plan.conditions, plan.values, INVOCATION_JOINS);
  const availableProviders = computeAvailableProviders(db, plan.conditions, plan.values, INVOCATION_JOINS);

  const summary = {
    totalInvocations: Number(summaryRow.totalInvocations) || 0,
    runningCount: Number(summaryRow.runningCount) || 0,
    failedCount: Number(summaryRow.failedCount) || 0,
    completedCount: Number(summaryRow.completedCount) || 0,
    cancelledCount: Number(summaryRow.cancelledCount) || 0,
    pausedCount: Number(summaryRow.pausedCount) || 0,
    totalTokens: Number(summaryRow.totalTokens) || 0,
    totalInputTokens: Number(summaryRow.totalInputTokens) || 0,
    totalOutputTokens: Number(summaryRow.totalOutputTokens) || 0,
    totalCachedTokens: Number(summaryRow.totalCachedTokens) || 0,
    avgDurationMs: Number(summaryRow.avgDurationMs) || 0,
    p95DurationMs,
    externalApiMetrics,
    sprintStateSummary,
    errorsByCategory
  };

  const items = computePageItems(db, plan);

  return { items, totalCount, summary, availablePurposes, availableProviders };
}
