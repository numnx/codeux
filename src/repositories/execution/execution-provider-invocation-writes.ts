import { randomUUID } from "crypto";
import { CreateExecutionInvocationInput, UpdateExecutionInvocationInput, AppendExecutionInvocationMessageInput, CreateSprintRunInput, UpdateSprintRunInput, CreateTaskDispatchInput, UpdateTaskDispatchInput, CreateTaskRunInput, UpdateTaskRunInput, CreateProviderInvocationUsageInput, UpdateProviderInvocationUsageInput, AcquireExecutionLeaseInput, RenewExecutionLeaseInput, SprintRunRecord, TaskDispatchRecord, TaskRunRecord, TaskRunEventRecord, SprintRunEventRecord, ProviderInvocationUsageRecord, ExecutionLeaseRecord } from "../../contracts/execution-types.js";
import { ExecutionInvocationRecord, ExecutionInvocationMessageRecord } from "../../contracts/invocation-types.js";
import { ConcurrencyConflictError, EntityNotFoundError, RepositoryError, ValidationError, serializePayloadJson } from "../repository-utils.js";
import { requireProject, requireSprint, requireTask, requireConnection, requireSprintRun, requireSprintRunScoped, requireTaskDispatch, requireTaskRun, requireProviderInvocationUsage, requireLease } from "./execution-validators.js";
import { DatabaseAdapter } from "../db/database-adapter.js";
import { ExecutionWriteContext } from "./execution-repository-types.js";

export function createProviderInvocationUsageWrite(db: DatabaseAdapter, input: CreateProviderInvocationUsageInput, ctx: ExecutionWriteContext): ProviderInvocationUsageRecord {
    try {
      requireProject(db, input.projectId);
      if (input.sprintId) {
        requireSprint(db, input.sprintId, input.projectId);
      }
      if (input.taskId) {
        requireTask(db, input.taskId, input.projectId, input.sprintId || undefined);
      }
      if (input.sprintRunId) {
        requireSprintRun((id: string) => ctx.getSprintRun(id), input.sprintRunId);
      }
      if (input.dispatchId) {
        requireTaskDispatch((id: string) => ctx.getTaskDispatch(id), input.dispatchId);
      }
      if (input.taskRunId) {
        requireTaskRun((id: string) => ctx.getTaskRun(id), input.taskRunId);
      }

      const id = randomUUID();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO provider_invocations (
          id, project_id, sprint_id, task_id, sprint_run_id, dispatch_id, task_run_id, attention_item_id,
          session_id, provider, purpose, status, model, execution_mode, native_session_id, started_at, finished_at, duration_ms,
          prompt_chars, transcript_chars, input_tokens, cached_input_tokens, output_tokens, reasoning_output_tokens,
          total_tokens, jules_tokens, usage_source, invocation_source, raw_usage_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.projectId,
        input.sprintId ?? null,
        input.taskId ?? null,
        input.sprintRunId ?? null,
        input.dispatchId ?? null,
        input.taskRunId ?? null,
        input.attentionItemId ?? null,
        input.sessionId,
        input.provider,
        input.purpose,
        input.status || "running",
        input.model ?? null,
        input.executionMode ?? null,
        input.nativeSessionId ?? null,
        input.startedAt || now,
        null,
        null,
        input.promptChars ?? 0,
        0,
        0,
        0,
        0,
        0,
        0,
        input.julesTokens ?? 0,
        "unavailable",
        input.invocationSource ?? "internal",
        null,
        now,
        now,
      );

      const created = requireProviderInvocationUsage((id: string) => ctx.getProviderInvocationUsage(id), id);
      ctx.notifyRealtime(created.projectId, false);
      return created;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, projectId: input.projectId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}

export function tryCreateProviderInvocationUsageWrite(db: DatabaseAdapter, input: CreateProviderInvocationUsageInput, limit: number, ctx: ExecutionWriteContext): ProviderInvocationUsageRecord | null {
    if (limit <= 0) {
      return createProviderInvocationUsageWrite(db, input, ctx);
    }

    return db.transaction(() => {
      // Use queryRunningProviderInvocationUsages logic but inside the transaction for atomicity.
      // We count rows where status is 'running' for this specific provider.
      const runningRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM provider_invocations
        WHERE status = 'running' AND provider = ?
      `).get(input.provider) as { count: number };

      if (runningRow.count >= limit) {
        return null;
      }

      return createProviderInvocationUsageWrite(db, input, ctx);
    });
}

export function updateProviderInvocationUsageWrite(db: DatabaseAdapter, invocationId: string, input: UpdateProviderInvocationUsageInput, ctx: ExecutionWriteContext): ProviderInvocationUsageRecord {
    try {
      const current = requireProviderInvocationUsage((id: string) => ctx.getProviderInvocationUsage(id), invocationId);
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE provider_invocations
        SET status = ?, model = ?, execution_mode = ?, native_session_id = ?, finished_at = ?, duration_ms = ?, transcript_chars = ?,
          input_tokens = ?, cached_input_tokens = ?, output_tokens = ?, reasoning_output_tokens = ?, total_tokens = ?,
          jules_tokens = ?, usage_source = ?, invocation_source = ?, raw_usage_json = ?, updated_at = ?
        WHERE id = ?
      `).run(
        input.status || current.status,
        input.model === undefined ? current.model : input.model,
        input.executionMode === undefined ? current.executionMode : input.executionMode,
        input.nativeSessionId === undefined ? current.nativeSessionId : input.nativeSessionId,
        input.finishedAt === undefined ? current.finishedAt : input.finishedAt,
        input.durationMs === undefined ? current.durationMs : input.durationMs,
        input.transcriptChars === undefined ? current.transcriptChars : input.transcriptChars,
        input.inputTokens === undefined ? current.inputTokens : input.inputTokens,
        input.cachedInputTokens === undefined ? current.cachedInputTokens : input.cachedInputTokens,
        input.outputTokens === undefined ? current.outputTokens : input.outputTokens,
        input.reasoningOutputTokens === undefined ? current.reasoningOutputTokens : input.reasoningOutputTokens,
        input.totalTokens === undefined ? current.totalTokens : input.totalTokens,
        input.julesTokens === undefined ? current.julesTokens : input.julesTokens,
        input.usageSource === undefined ? current.usageSource : input.usageSource,
        input.invocationSource === undefined ? current.invocationSource : input.invocationSource,
        input.rawUsageJson === undefined
          ? serializePayloadJson(current.rawUsageJson)
          : (input.rawUsageJson === null ? null : serializePayloadJson(input.rawUsageJson)),
        now,
        invocationId,
      );

      const updated = requireProviderInvocationUsage((id: string) => ctx.getProviderInvocationUsage(id), invocationId);
      ctx.notifyRealtime(updated.projectId, false);
      return updated;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, invocationId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}
