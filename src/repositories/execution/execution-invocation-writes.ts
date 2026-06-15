import { randomUUID } from "crypto";
import { CreateExecutionInvocationInput, UpdateExecutionInvocationInput, AppendExecutionInvocationMessageInput, CreateSprintRunInput, UpdateSprintRunInput, CreateTaskDispatchInput, UpdateTaskDispatchInput, CreateTaskRunInput, UpdateTaskRunInput, CreateProviderInvocationUsageInput, UpdateProviderInvocationUsageInput, AcquireExecutionLeaseInput, RenewExecutionLeaseInput, SprintRunRecord, TaskDispatchRecord, TaskRunRecord, TaskRunEventRecord, SprintRunEventRecord, ProviderInvocationUsageRecord, ExecutionLeaseRecord } from "../../contracts/execution-types.js";
import { ExecutionInvocationRecord, ExecutionInvocationMessageRecord } from "../../contracts/invocation-types.js";
import { ConcurrencyConflictError, EntityNotFoundError, RepositoryError, ValidationError, serializePayloadJson } from "../repository-utils.js";
import { requireProject, requireSprint, requireTask, requireConnection, requireSprintRun, requireSprintRunScoped, requireTaskDispatch, requireTaskRun, requireProviderInvocationUsage, requireLease } from "./execution-validators.js";
import { DatabaseAdapter } from "../db/database-adapter.js";
import { ExecutionWriteContext } from "./execution-repository-types.js";
import { queryExecutionInvocationMessages } from "./execution-invocations-query.js";

export function createExecutionInvocationWrite(db: DatabaseAdapter, input: CreateExecutionInvocationInput, ctx: ExecutionWriteContext): ExecutionInvocationRecord {
    try {
      if (!input.skipValidation) {
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
      }

      let taskAgentPresetId: string | null = null;
      if (input.taskId) {
        const taskRow = db.prepare(`SELECT agent_preset_id FROM tasks WHERE id = ?`).get(input.taskId) as { agent_preset_id: string | null } | undefined;
        taskAgentPresetId = taskRow?.agent_preset_id || null;
      }

      const id = `xi_${randomUUID().replace(/-/g, "")}`;
      const now = new Date().toISOString();
      const startedAt = input.startedAt || now;

      const record: ExecutionInvocationRecord = {
        id,
        projectId: input.projectId,
        sprintId: input.sprintId || null,
        taskId: input.taskId || null,
        sprintRunId: input.sprintRunId || null,
        dispatchId: input.dispatchId || null,
        taskRunId: input.taskRunId || null,
        attentionItemId: input.attentionItemId || null,
        providerInvocationId: input.providerInvocationId || null,
        type: input.type,
        status: input.status || "running",
        provider: input.provider || null,
        model: input.model || null,
        systemPrompt: input.systemPrompt || null,
        startedAt,
        finishedAt: input.finishedAt || null,
        errorMessage: input.errorMessage || null,
        lastErrorCategory: input.lastErrorCategory || null,
        lastErrorMessage: input.lastErrorMessage || null,
        lastRetryAfterIso: input.lastRetryAfterIso || null,
        invocationSource: input.invocationSource || "internal",
        agentPresetId: taskAgentPresetId,
        messageCount: 0,
        lastMessageAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const stmt = db.prepare(`
        INSERT INTO execution_invocations (
          id, project_id, sprint_id, task_id, sprint_run_id, dispatch_id, task_run_id, attention_item_id, provider_invocation_id,
          type, status, provider, model, system_prompt, started_at, finished_at, error_message, message_count, last_message_at,
          last_error_category, last_error_message, last_retry_after_iso, invocation_source, agent_preset_id,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        record.id,
        record.projectId,
        record.sprintId,
        record.taskId,
        record.sprintRunId,
        record.dispatchId,
        record.taskRunId,
        record.attentionItemId,
        record.providerInvocationId,
        record.type,
        record.status,
        record.provider,
        record.model,
        record.systemPrompt,
          record.startedAt,
          record.finishedAt,
          record.errorMessage,
          record.messageCount,
          record.lastMessageAt,
          record.lastErrorCategory,
          record.lastErrorMessage,
          record.lastRetryAfterIso,
          record.invocationSource || "internal",
          record.agentPresetId,
          record.createdAt,
          record.updatedAt
      );

      ctx.notifyRealtime(record.projectId, true);
      return record;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      if (error instanceof Error && (error.message.includes('constraint failed') || error.message.includes('FOREIGN KEY'))) {
        throw new ValidationError(error.message);
      }
      ctx.logger.error("Operation failed", { error, projectId: input.projectId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}

export function updateExecutionInvocationWrite(db: DatabaseAdapter, id: string, input: UpdateExecutionInvocationInput, ctx: ExecutionWriteContext): ExecutionInvocationRecord {
    try {
      const existing = ctx.getExecutionInvocation(id);
      if (!existing) {
        throw new EntityNotFoundError(`Execution invocation not found: ${id}`);
      }

      const now = new Date().toISOString();
      const updates: string[] = [];
      const values: any[] = [];

      if (input.status !== undefined) {
        updates.push("status = ?");
        values.push(input.status);
        existing.status = input.status;
      }
      if (input.providerInvocationId !== undefined) {
        updates.push("provider_invocation_id = ?");
        values.push(input.providerInvocationId);
        existing.providerInvocationId = input.providerInvocationId;
      }
      if (input.provider !== undefined) {
        updates.push("provider = ?");
        values.push(input.provider);
        existing.provider = input.provider;
      }
      if (input.model !== undefined) {
        updates.push("model = ?");
        values.push(input.model);
        existing.model = input.model;
      }
      if (input.finishedAt !== undefined) {
        updates.push("finished_at = ?");
        values.push(input.finishedAt);
        existing.finishedAt = input.finishedAt;
      }
      if (input.errorMessage !== undefined) {
        updates.push("error_message = ?");
        values.push(input.errorMessage);
        existing.errorMessage = input.errorMessage;
      }
      if (input.lastErrorCategory !== undefined) {
        updates.push("last_error_category = ?");
        values.push(input.lastErrorCategory);
        existing.lastErrorCategory = input.lastErrorCategory;
      }
      if (input.lastErrorMessage !== undefined) {
        updates.push("last_error_message = ?");
        values.push(input.lastErrorMessage);
        existing.lastErrorMessage = input.lastErrorMessage;
      }
      if (input.lastRetryAfterIso !== undefined) {
        updates.push("last_retry_after_iso = ?");
        values.push(input.lastRetryAfterIso);
        existing.lastRetryAfterIso = input.lastRetryAfterIso;
      }

      if (updates.length > 0) {
        updates.push("updated_at = ?");
        values.push(now);
        existing.updatedAt = now;

        values.push(id);
        const sql = `UPDATE execution_invocations SET ${updates.join(", ")} WHERE id = ?`;
        const stmt = db.prepare(sql);
        stmt.run(...values);

        ctx.notifyRealtime(existing.projectId, true);
      }

      return existing;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, id });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}

export function listExecutionInvocationMessagesWrite(db: DatabaseAdapter, invocationId: string, ctx: ExecutionWriteContext): ExecutionInvocationMessageRecord[] {
    return queryExecutionInvocationMessages(db, invocationId);
}

export function clearExecutionInvocationMessagesWrite(db: DatabaseAdapter, invocationId: string, ctx: ExecutionWriteContext): void {
    try {
      const invocation = ctx.getExecutionInvocation(invocationId);
      if (!invocation) {
        throw new EntityNotFoundError(`Execution invocation not found: ${invocationId}`);
      }

      db.prepare(`
        DELETE FROM execution_invocation_messages
        WHERE invocation_id = ?
      `).run(invocationId);

      db.prepare(`
        UPDATE execution_invocations
        SET message_count = 0,
            last_message_at = null,
            updated_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), invocationId);

      ctx.notifyRealtime(invocation.projectId, false);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, invocationId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}

export function appendExecutionInvocationMessageWrite(db: DatabaseAdapter, invocationId: string, input: AppendExecutionInvocationMessageInput, ctx: ExecutionWriteContext): ExecutionInvocationMessageRecord {
    try {
      const invocation = ctx.getExecutionInvocation(invocationId);
      if (!invocation) {
        throw new EntityNotFoundError(`Execution invocation not found: ${invocationId}`);
      }

      const id = `xim_${randomUUID().replace(/-/g, "")}`;
      const now = input.createdAt || new Date().toISOString();

      const record: ExecutionInvocationMessageRecord = {
        id,
        invocationId,
        role: input.role,
        contentMarkdown: input.contentMarkdown,
        toolCallsJson: input.toolCallsJson || null,
        metadata: input.metadata || null,
        createdAt: now,
      };

      const stmt = db.prepare(`
        INSERT INTO execution_invocation_messages (
          id, invocation_id, role, content_markdown, tool_calls_json, metadata_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        record.id,
        record.invocationId,
        record.role,
        record.contentMarkdown,
        record.toolCallsJson ? serializePayloadJson(record.toolCallsJson) : null,
        record.metadata ? serializePayloadJson(record.metadata) : null,
        record.createdAt
      );

      const updateStmt = db.prepare(`
        UPDATE execution_invocations
        SET message_count = message_count + 1,
            last_message_at = ?,
            updated_at = ?
        WHERE id = ?
      `);
      updateStmt.run(now, now, invocationId);

      ctx.notifyRealtime(invocation.projectId, false);
      return record;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, invocationId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}
