import { randomUUID } from "node:crypto";
import { RepositoryError, ConcurrencyConflictError, EntityNotFoundError, ValidationError } from "../repository-utils.js";
import {
  requireProject,
  requireSprint,
  requireSprintRun,
  requireSprintRunScoped,
  requireTask,
  requireTaskDispatch,
  requireConnection,
  requireTaskRun,
  requireLease,
  requireProviderInvocationUsage
} from "./execution-validators.js";
import { serializePayloadJson } from "../repository-utils.js";
import type { ExecutionRepository } from "../execution-repository.js";
import type {
  SprintRunRecord, CreateSprintRunInput, UpdateSprintRunInput,
  TaskRunRecord, CreateTaskRunInput, UpdateTaskRunInput,
  TaskDispatchRecord, CreateTaskDispatchInput, UpdateTaskDispatchInput,
  ExecutionLeaseRecord, AcquireExecutionLeaseInput, RenewExecutionLeaseInput,
  CreateProviderInvocationUsageInput, UpdateProviderInvocationUsageInput, ProviderInvocationUsageRecord
} from "../../contracts/execution-types.js";
import type {
  ExecutionInvocationRecord,
  ExecutionInvocationMessageRecord,
  CreateExecutionInvocationInput,
  UpdateExecutionInvocationInput,
  AppendExecutionInvocationMessageInput
} from "../../contracts/invocation-types.js";

export function createExecutionInvocation(repo: ExecutionRepository, input: CreateExecutionInvocationInput): ExecutionInvocationRecord {
    try {
      if (!input.skipValidation) {
        requireProject(repo.db, input.projectId);
        if (input.sprintId) {
          requireSprint(repo.db, input.sprintId, input.projectId);
        }
        if (input.taskId) {
          requireTask(repo.db, input.taskId, input.projectId, input.sprintId || undefined);
        }
        if (input.sprintRunId) {
          requireSprintRunScoped((id: string) => repo.getSprintRun(id), input.sprintRunId, input.projectId, input.sprintId as string);
        }
        if (input.dispatchId) {
          requireTaskDispatch((id: string) => repo.getTaskDispatch(id), input.dispatchId);
        }
        if (input.taskRunId) {
          requireTaskRun((id: string) => repo.getTaskRun(id), input.taskRunId);
        }
      }

      let taskAgentPresetId: string | null = null;
      if (input.taskId) {
        const taskRow = repo.db.prepare(`SELECT agent_preset_id FROM tasks WHERE id = ?`).get(input.taskId) as { agent_preset_id: string | null } | undefined;
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

      const stmt = repo.db.prepare(`
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

      repo.notifyRealtime(record.projectId, true);
      return record;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      if (error instanceof Error && (error.message.includes('constraint failed') || error.message.includes('FOREIGN KEY'))) {
        throw new ValidationError(error.message);
      }
      repo.logger.error("Operation failed", { error, projectId: input.projectId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function updateExecutionInvocation(repo: ExecutionRepository, id: string, input: UpdateExecutionInvocationInput): ExecutionInvocationRecord {
    try {
      const existing = repo.getExecutionInvocation(id);
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
        const stmt = repo.db.prepare(sql);
        stmt.run(...values);

        repo.notifyRealtime(existing.projectId, true);
      }

      return existing;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, id });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function appendExecutionInvocationMessage(repo: ExecutionRepository, invocationId: string, input: AppendExecutionInvocationMessageInput): ExecutionInvocationMessageRecord {
    try {
      const invocation = repo.getExecutionInvocation(invocationId);
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

      const stmt = repo.db.prepare(`
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

      const updateStmt = repo.db.prepare(`
        UPDATE execution_invocations
        SET message_count = message_count + 1,
            last_message_at = ?,
            updated_at = ?
        WHERE id = ?
      `);
      updateStmt.run(now, now, invocationId);

      repo.notifyRealtime(invocation.projectId, false);
      return record;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, invocationId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function clearExecutionInvocationMessages(repo: ExecutionRepository, invocationId: string): void {
    try {
      const invocation = repo.getExecutionInvocation(invocationId);
      if (!invocation) {
        throw new EntityNotFoundError(`Execution invocation not found: ${invocationId}`);
      }

      repo.db.prepare(`
        DELETE FROM execution_invocation_messages
        WHERE invocation_id = ?
      `).run(invocationId);

      repo.db.prepare(`
        UPDATE execution_invocations
        SET message_count = 0,
            last_message_at = null,
            updated_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), invocationId);

      repo.notifyRealtime(invocation.projectId, false);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, invocationId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function createProviderInvocationUsage(repo: ExecutionRepository, input: CreateProviderInvocationUsageInput): ProviderInvocationUsageRecord {
    try {
      requireProject(repo.db, input.projectId);
      if (input.sprintId) {
        requireSprint(repo.db, input.sprintId, input.projectId);
      }
      if (input.taskId) {
        requireTask(repo.db, input.taskId, input.projectId, input.sprintId || undefined);
      }
      if (input.sprintRunId) {
        requireSprintRunScoped((id: string) => repo.getSprintRun(id), input.sprintRunId, input.projectId, input.sprintId as string);
      }
      if (input.dispatchId) {
        requireTaskDispatch((id: string) => repo.getTaskDispatch(id), input.dispatchId);
      }
      if (input.taskRunId) {
        requireTaskRun((id: string) => repo.getTaskRun(id), input.taskRunId);
      }

      const id = randomUUID();
      const now = new Date().toISOString();
      repo.db.prepare(`
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

      const created = requireProviderInvocationUsage((id: string) => repo.getProviderInvocationUsage(id), id);
      repo.notifyRealtime(created.projectId, false);
      return created;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, projectId: input.projectId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function tryCreateProviderInvocationUsage(repo: ExecutionRepository, input: CreateProviderInvocationUsageInput, limit: number): ProviderInvocationUsageRecord | null {
    if (limit <= 0) {
      return repo.createProviderInvocationUsage(input);
    }

    return repo.db.transaction(() => {
      // Use queryRunningProviderInvocationUsages logic but inside the transaction for atomicity.
      // We count rows where status is 'running' for this specific provider.
      const runningRow = repo.db.prepare(`
        SELECT COUNT(*) as count
        FROM provider_invocations
        WHERE status = 'running' AND provider = ?
      `).get(input.provider) as { count: number };

      if (runningRow.count >= limit) {
        return null;
      }

      return repo.createProviderInvocationUsage(input);
    });
  }

export function updateProviderInvocationUsage(repo: ExecutionRepository, invocationId: string, input: UpdateProviderInvocationUsageInput): ProviderInvocationUsageRecord {
    try {
      const current = requireProviderInvocationUsage((id: string) => repo.getProviderInvocationUsage(id), invocationId);
      const now = new Date().toISOString();
      repo.db.prepare(`
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

      const updated = requireProviderInvocationUsage((id: string) => repo.getProviderInvocationUsage(id), invocationId);
      repo.notifyRealtime(updated.projectId, false);
      return updated;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, invocationId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }
