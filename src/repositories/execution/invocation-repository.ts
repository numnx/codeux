import { randomUUID } from "crypto";
import { DatabaseAdapter } from "../db/database-adapter.js";
import { SprintRunRepository } from "./sprint-run-repository.js";
import { TaskRunRepository } from "./task-run-repository.js";
import {
  requireProject,
  requireSprint,
  requireTask,
  requireSprintRun,
  requireTaskDispatch,
  requireTaskRun,
  requireProviderInvocationUsage,
} from "./execution-validators.js";
import {
  queryExecutionInvocation,
  queryProviderInvocationUsage,
  queryLatestProviderInvocationUsageBySession,
  queryRunningProviderInvocationUsages,
} from "./execution-invocation-query.js";
import {
  queryExecutionInvocations,
  queryExecutionInvocationMessages,
  queryExecutionInvocationsByProviderInvocationId,
} from "./execution-invocations-query.js";
import type {
  ExecutionInvocationRecord,
  ExecutionInvocationMessageRecord,
  CreateExecutionInvocationInput,
  UpdateExecutionInvocationInput,
  AppendExecutionInvocationMessageInput,
} from "../../contracts/invocation-types.js";
import type {
  CreateProviderInvocationUsageInput,
  ProviderInvocationUsageRecord,
  UpdateProviderInvocationUsageInput,
} from "../../contracts/execution-types.js";

export class InvocationRepository {
  constructor(
    private readonly db: DatabaseAdapter,
    private readonly sprintRunRepo: SprintRunRepository,
    private readonly taskRunRepo: TaskRunRepository,
    private readonly onNotifyRealtime: (projectId: string, includeOverview: boolean) => void,
  ) {}

  createExecutionInvocation(input: CreateExecutionInvocationInput): ExecutionInvocationRecord {
    requireProject(this.db, input.projectId);
    if (input.sprintId) {
      requireSprint(this.db, input.sprintId, input.projectId);
    }
    if (input.taskId) {
      requireTask(this.db, input.taskId, input.projectId, input.sprintId || undefined);
    }
    if (input.sprintRunId) {
      requireSprintRun((id) => this.sprintRunRepo.getSprintRun(id), input.sprintRunId);
    }
    if (input.dispatchId) {
      requireTaskDispatch((id) => this.sprintRunRepo.getTaskDispatch(id), input.dispatchId);
    }
    if (input.taskRunId) {
      requireTaskRun((id) => this.taskRunRepo.getTaskRun(id), input.taskRunId);
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
      messageCount: 0,
      lastMessageAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO execution_invocations (
        id, project_id, sprint_id, task_id, sprint_run_id, dispatch_id, task_run_id, attention_item_id, provider_invocation_id,
        type, status, provider, model, system_prompt, started_at, finished_at, error_message, message_count, last_message_at,
        last_error_category, last_error_message, last_retry_after_iso,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      record.createdAt,
      record.updatedAt
    );

    this.onNotifyRealtime(record.projectId, true);
    return record;
  }

  updateExecutionInvocation(id: string, input: UpdateExecutionInvocationInput): ExecutionInvocationRecord {
    const existing = this.getExecutionInvocation(id);
    if (!existing) {
      throw new Error(`Execution invocation not found: ${id}`);
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
      const stmt = this.db.prepare(sql);
      stmt.run(...values);

      this.onNotifyRealtime(existing.projectId, true);
    }

    return existing;
  }

  getExecutionInvocation(id: string): ExecutionInvocationRecord | null {
    return queryExecutionInvocation(this.db, id);
  }

  listExecutionInvocations(params: {
    projectId: string;
    sprintRunId?: string;
    taskRunId?: string;
    limit?: number;
    offset?: number;
  }): ExecutionInvocationRecord[] {
    return queryExecutionInvocations(this.db, params);
  }

  listExecutionInvocationMessages(invocationId: string): ExecutionInvocationMessageRecord[] {
    return queryExecutionInvocationMessages(this.db, invocationId);
  }

  appendExecutionInvocationMessage(invocationId: string, input: AppendExecutionInvocationMessageInput): ExecutionInvocationMessageRecord {
    const invocation = this.getExecutionInvocation(invocationId);
    if (!invocation) {
      throw new Error(`Execution invocation not found: ${invocationId}`);
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

    const stmt = this.db.prepare(`
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
      record.toolCallsJson ? JSON.stringify(record.toolCallsJson) : null,
      record.metadata ? JSON.stringify(record.metadata) : null,
      record.createdAt
    );

    const updateStmt = this.db.prepare(`
      UPDATE execution_invocations
      SET message_count = message_count + 1,
          last_message_at = ?,
          updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(now, now, invocationId);

    this.onNotifyRealtime(invocation.projectId, false);
    return record;
  }

  createProviderInvocationUsage(input: CreateProviderInvocationUsageInput): ProviderInvocationUsageRecord {
    requireProject(this.db, input.projectId);
    if (input.sprintId) {
      requireSprint(this.db, input.sprintId, input.projectId);
    }
    if (input.taskId) {
      requireTask(this.db, input.taskId, input.projectId, input.sprintId || undefined);
    }
    if (input.sprintRunId) {
      requireSprintRun((id) => this.sprintRunRepo.getSprintRun(id), input.sprintRunId);
    }
    if (input.dispatchId) {
      requireTaskDispatch((id) => this.sprintRunRepo.getTaskDispatch(id), input.dispatchId);
    }
    if (input.taskRunId) {
      requireTaskRun((id) => this.taskRunRepo.getTaskRun(id), input.taskRunId);
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO provider_invocations (
        id, project_id, sprint_id, task_id, sprint_run_id, dispatch_id, task_run_id, attention_item_id,
        session_id, provider, purpose, status, model, execution_mode, native_session_id, started_at, finished_at, duration_ms,
        prompt_chars, transcript_chars, input_tokens, cached_input_tokens, output_tokens, reasoning_output_tokens,
        total_tokens, usage_source, raw_usage_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      "unavailable",
      null,
      now,
      now,
    );

    const created = requireProviderInvocationUsage((id) => this.getProviderInvocationUsage(id), id);
    this.onNotifyRealtime(created.projectId, false);
    return created;
  }

  updateProviderInvocationUsage(invocationId: string, input: UpdateProviderInvocationUsageInput): ProviderInvocationUsageRecord {
    const current = requireProviderInvocationUsage((id) => this.getProviderInvocationUsage(id), invocationId);
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE provider_invocations
      SET status = ?, model = ?, execution_mode = ?, native_session_id = ?, finished_at = ?, duration_ms = ?, transcript_chars = ?,
        input_tokens = ?, cached_input_tokens = ?, output_tokens = ?, reasoning_output_tokens = ?, total_tokens = ?,
        usage_source = ?, raw_usage_json = ?, updated_at = ?
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
      input.usageSource === undefined ? current.usageSource : input.usageSource,
      input.rawUsageJson === undefined
        ? JSON.stringify(current.rawUsageJson)
        : (input.rawUsageJson === null ? null : JSON.stringify(input.rawUsageJson)),
      now,
      invocationId,
    );

    const updated = requireProviderInvocationUsage((id) => this.getProviderInvocationUsage(id), invocationId);
    this.onNotifyRealtime(updated.projectId, false);
    return updated;
  }

  getProviderInvocationUsage(invocationId: string): ProviderInvocationUsageRecord | null {
    return queryProviderInvocationUsage(this.db, invocationId);
  }

  getLatestProviderInvocationUsageBySession(
    sessionId: string,
    purpose?: ProviderInvocationUsageRecord["purpose"],
  ): ProviderInvocationUsageRecord | null {
    return queryLatestProviderInvocationUsageBySession(this.db, sessionId, purpose);
  }

  listRunningProviderInvocationUsages(providers?: string[]): ProviderInvocationUsageRecord[] {
    return queryRunningProviderInvocationUsages(this.db, providers);
  }

  listExecutionInvocationsByProviderInvocationId(providerInvocationId: string): ExecutionInvocationRecord[] {
    return queryExecutionInvocationsByProviderInvocationId(this.db, providerInvocationId);
  }
}
