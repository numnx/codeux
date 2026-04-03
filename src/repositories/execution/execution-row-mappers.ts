import type {
  SprintRunRecord,
  TaskDispatchRecord,
  ExecutionLeaseRecord,
  TaskRunRecord,
  TaskRunEventRecord,
  ProviderInvocationUsageRecord,
  SprintRunEventRecord,
  ExecutionInvocationRecord,
  ExecutionInvocationMessageRecord
} from "../../contracts/execution-types.js";

import type {
  ExecutionHumanInterventionSummary,
  ExecutionUsageTotals,
  ExecutionSprintRunSummary,
  ExecutionTaskDispatchSummary,
  ExecutionRuntimeEventSummary,
  OverviewTelemetryProjectSummary
} from "../../contracts/app-types.js";

export interface SprintRunRow {
  id: string;
  project_id: string;
  sprint_id: string;
  status: string;
  trigger_type: string;
  triggered_by: string | null;
  executor_mode: string;
  started_at: string | null;
  finished_at: string | null;
  last_heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskDispatchRow {
  id: string;
  project_id: string;
  sprint_id: string;
  task_id: string;
  sprint_run_id: string;
  connection_id: string | null;
  executor_type: string;
  status: string;
  priority: number | string;
  queued_at: string;
  claimed_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  last_heartbeat_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutionLeaseRow {
  id: string;
  scope_type: string;
  scope_id: string;
  owner_key: string;
  lease_token: string;
  acquired_at: string;
  expires_at: string;
  last_heartbeat_at: string | null;
}

export interface TaskRunRow {
  id: string;
  project_id: string;
  sprint_id: string;
  task_id: string;
  sprint_run_id: string | null;
  dispatch_id: string | null;
  connection_id: string | null;
  provider: string | null;
  mode: string | null;
  session_id: string | null;
  session_name: string | null;
  state: string;
  worker_branch: string | null;
  pr_url: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | string | null;
}

export interface TaskRunEventRow {
  id: string;
  task_run_id: string;
  event_type: string;
  originator: string | null;
  payload_json: string | null;
  source_event_key: string | null;
  created_at: string;
}

export interface ProviderInvocationUsageRow {
  id: string;
  project_id: string;
  sprint_id: string | null;
  task_id: string | null;
  sprint_run_id: string | null;
  dispatch_id: string | null;
  task_run_id: string | null;
  attention_item_id: string | null;
  session_id: string;
  provider: string;
  purpose: string;
  status: string;
  model: string | null;
  native_session_id: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | string | null;
  prompt_chars: number | string;
  transcript_chars: number | string;
  input_tokens: number | string;
  cached_input_tokens: number | string;
  output_tokens: number | string;
  reasoning_output_tokens: number | string;
  total_tokens: number | string;
  usage_source: string;
  raw_usage_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface SprintRunEventRow {
  id: string;
  sprint_run_id: string;
  event_type: string;
  originator: string | null;
  payload_json: string | null;
  source_event_key: string | null;
  created_at: string;
}

export interface ExecutionSprintRunSummaryRow {
  id: string;
  project_id: string;
  sprint_id: string;
  sprint_name: string;
  sprint_number: number | string | null;
  status: string;
  trigger_type: string;
  triggered_by: string | null;
  executor_mode: string;
  started_at: string | null;
  finished_at: string | null;
  last_heartbeat_at: string | null;
  created_at: string;
  active_lease_owner_key: string | null;
  active_lease_expires_at: string | null;
}

export interface ExecutionTaskDispatchSummaryRow {
  id: string;
  project_id: string;
  sprint_id: string;
  sprint_run_id: string;
  sprint_name: string;
  sprint_number: number | string | null;
  task_id: string;
  task_key: string;
  task_title: string;
  status: string;
  executor_type: string;
  priority: number | string;
  connection_id: string | null;
  connection_display_name: string | null;
  connection_role: string | null;
  task_run_id: string | null;
  task_run_state: string | null;
  provider: string | null;
  session_id: string | null;
  session_name: string | null;
  worker_branch: string | null;
  pr_url: string | null;
  queued_at: string;
  claimed_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  last_heartbeat_at: string | null;
  error_message: string | null;
  active_lease_owner_key: string | null;
  active_lease_expires_at: string | null;
}

export interface ExecutionRuntimeEventSummaryRow {
  id: string;
  scope_type: string;
  task_run_id: string | null;
  sprint_run_id: string | null;
  dispatch_id: string | null;
  project_id: string;
  sprint_id: string;
  sprint_name: string;
  sprint_number: number | string | null;
  sprint_run_status: string | null;
  task_id: string | null;
  task_key: string | null;
  task_title: string | null;
  task_run_state: string | null;
  event_type: string;
  originator: string | null;
  source_event_key: string | null;
  provider: string | null;
  session_id: string | null;
  session_name: string | null;
  worker_branch: string | null;
  pr_url: string | null;
  connection_id: string | null;
  connection_display_name: string | null;
  connection_role: string | null;
  created_at: string;
  payload_json: string | null;
}

export interface OverviewTelemetryProjectSummaryRow {
  project_id: string;
  project_name: string;
  sprint_id: string;
  sprint_name: string;
  sprint_number: number | string | null;
  sprint_run_id: string | null;
  sprint_run_status: string | null;
  active_dispatch_count: number | string;
  running_dispatch_count: number | string;
  updated_at: string | null;
}

export function toNumber(value: number | string): number {
  if (typeof value === "number") {
    return value;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function parsePayloadJson(value: string | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

export function mapSprintRunRow(row: SprintRunRow): SprintRunRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    sprintId: row.sprint_id,
    status: row.status as SprintRunRecord["status"],
    triggerType: row.trigger_type as SprintRunRecord["triggerType"],
    triggeredBy: row.triggered_by,
    executorMode: row.executor_mode as SprintRunRecord["executorMode"],
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    lastHeartbeatAt: row.last_heartbeat_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTaskDispatchRow(row: TaskDispatchRow): TaskDispatchRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    sprintId: row.sprint_id,
    taskId: row.task_id,
    sprintRunId: row.sprint_run_id,
    connectionId: row.connection_id,
    executorType: row.executor_type as TaskDispatchRecord["executorType"],
    status: row.status as TaskDispatchRecord["status"],
    priority: toNumber(row.priority),
    queuedAt: row.queued_at,
    claimedAt: row.claimed_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    lastHeartbeatAt: row.last_heartbeat_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapExecutionLeaseRow(row: ExecutionLeaseRow): ExecutionLeaseRecord {
  return {
    id: row.id,
    scopeType: row.scope_type as ExecutionLeaseRecord["scopeType"],
    scopeId: row.scope_id,
    ownerKey: row.owner_key,
    leaseToken: row.lease_token,
    acquiredAt: row.acquired_at,
    expiresAt: row.expires_at,
    lastHeartbeatAt: row.last_heartbeat_at,
  };
}

export function mapTaskRunRow(row: TaskRunRow): TaskRunRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    sprintId: row.sprint_id,
    taskId: row.task_id,
    sprintRunId: row.sprint_run_id,
    dispatchId: row.dispatch_id,
    connectionId: row.connection_id,
    provider: row.provider,
    mode: row.mode,
    sessionId: row.session_id,
    sessionName: row.session_name,
    state: row.state as TaskRunRecord["state"],
    workerBranch: row.worker_branch,
    prUrl: row.pr_url,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms === null ? null : toNumber(row.duration_ms),
  };
}

export function mapTaskRunEventRow(row: TaskRunEventRow): TaskRunEventRecord {
  return {
    id: row.id,
    taskRunId: row.task_run_id,
    eventType: row.event_type,
    originator: row.originator,
    payload: parsePayloadJson(row.payload_json),
    sourceEventKey: row.source_event_key,
    createdAt: row.created_at,
  };
}

export function mapProviderInvocationUsageRow(row: ProviderInvocationUsageRow): ProviderInvocationUsageRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    sprintId: row.sprint_id,
    taskId: row.task_id,
    sprintRunId: row.sprint_run_id,
    dispatchId: row.dispatch_id,
    taskRunId: row.task_run_id,
    attentionItemId: row.attention_item_id,
    sessionId: row.session_id,
    provider: row.provider,
    purpose: row.purpose as ProviderInvocationUsageRecord["purpose"],
    status: row.status as ProviderInvocationUsageRecord["status"],
    model: row.model,
    nativeSessionId: row.native_session_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms === null ? null : toNumber(row.duration_ms),
    promptChars: toNumber(row.prompt_chars),
    transcriptChars: toNumber(row.transcript_chars),
    inputTokens: toNumber(row.input_tokens),
    cachedInputTokens: toNumber(row.cached_input_tokens),
    outputTokens: toNumber(row.output_tokens),
    reasoningOutputTokens: toNumber(row.reasoning_output_tokens),
    totalTokens: toNumber(row.input_tokens) + toNumber(row.output_tokens),
    usageSource: row.usage_source as ProviderInvocationUsageRecord["usageSource"],
    rawUsageJson: parsePayloadJson(row.raw_usage_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSprintRunEventRow(row: SprintRunEventRow): SprintRunEventRecord {
  return {
    id: row.id,
    sprintRunId: row.sprint_run_id,
    eventType: row.event_type,
    originator: row.originator,
    payload: parsePayloadJson(row.payload_json),
    sourceEventKey: row.source_event_key,
    createdAt: row.created_at,
  };
}

export function mapExecutionSprintRunSummaryRow(
  row: ExecutionSprintRunSummaryRow,
  humanIntervention: ExecutionHumanInterventionSummary | null,
  usage: ExecutionUsageTotals,
): ExecutionSprintRunSummary {
  return {
    id: row.id,
    projectId: row.project_id,
    sprintId: row.sprint_id,
    sprintName: row.sprint_name,
    sprintNumber: row.sprint_number === null ? null : toNumber(row.sprint_number),
    status: row.status,
    triggerType: row.trigger_type,
    triggeredBy: row.triggered_by,
    executorMode: row.executor_mode,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    lastHeartbeatAt: row.last_heartbeat_at,
    createdAt: row.created_at,
    activeLeaseOwnerKey: row.active_lease_owner_key,
    activeLeaseExpiresAt: row.active_lease_expires_at,
    humanIntervention,
    usage,
  };
}

export function mapExecutionTaskDispatchSummaryRow(row: ExecutionTaskDispatchSummaryRow, usage: ExecutionUsageTotals): ExecutionTaskDispatchSummary {
  return {
    id: row.id,
    projectId: row.project_id,
    sprintId: row.sprint_id,
    sprintRunId: row.sprint_run_id,
    sprintName: row.sprint_name,
    sprintNumber: row.sprint_number === null ? null : toNumber(row.sprint_number),
    taskId: row.task_id,
    taskKey: row.task_key,
    taskTitle: row.task_title,
    status: row.status,
    executorType: row.executor_type,
    priority: toNumber(row.priority),
    connectionId: row.connection_id,
    connectionDisplayName: row.connection_display_name,
    connectionRole: row.connection_role,
    taskRunId: row.task_run_id,
    taskRunState: row.task_run_state,
    provider: row.provider,
    sessionId: row.session_id,
    sessionName: row.session_name,
    workerBranch: row.worker_branch,
    prUrl: row.pr_url,
    queuedAt: row.queued_at,
    claimedAt: row.claimed_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    lastHeartbeatAt: row.last_heartbeat_at,
    errorMessage: row.error_message,
    activeLeaseOwnerKey: row.active_lease_owner_key,
    activeLeaseExpiresAt: row.active_lease_expires_at,
    usage,
  };
}

export function mapExecutionRuntimeEventSummaryRow(row: ExecutionRuntimeEventSummaryRow): ExecutionRuntimeEventSummary {
  return {
    id: row.id,
    scopeType: row.scope_type === "sprint_run" ? "sprint_run" : "task_run",
    taskRunId: row.task_run_id,
    sprintRunId: row.sprint_run_id,
    dispatchId: row.dispatch_id,
    projectId: row.project_id,
    sprintId: row.sprint_id,
    sprintName: row.sprint_name,
    sprintNumber: row.sprint_number === null ? null : toNumber(row.sprint_number),
    sprintRunStatus: row.sprint_run_status,
    taskId: row.task_id,
    taskKey: row.task_key,
    taskTitle: row.task_title,
    taskRunState: row.task_run_state,
    eventType: row.event_type,
    originator: row.originator,
    sourceEventKey: row.source_event_key,
    provider: row.provider,
    sessionId: row.session_id,
    sessionName: row.session_name,
    workerBranch: row.worker_branch,
    prUrl: row.pr_url,
    connectionId: row.connection_id,
    connectionDisplayName: row.connection_display_name,
    connectionRole: row.connection_role,
    createdAt: row.created_at,
    payload: parsePayloadJson(row.payload_json),
  };
}

export function mapOverviewTelemetryProjectSummaryRow(
  row: OverviewTelemetryProjectSummaryRow,
  humanIntervention: ExecutionHumanInterventionSummary | null,
): OverviewTelemetryProjectSummary {
  return {
    projectId: row.project_id,
    projectName: row.project_name,
    sprintId: row.sprint_id,
    sprintName: row.sprint_name,
    sprintNumber: row.sprint_number === null ? null : toNumber(row.sprint_number),
    sprintRunId: row.sprint_run_id || "",
    sprintRunStatus: row.sprint_run_status || "",
    activeDispatchCount: toNumber(row.active_dispatch_count),
    runningDispatchCount: toNumber(row.running_dispatch_count),
    updatedAt: row.updated_at,
    humanIntervention,
  };
}

export function mapExecutionInvocationRow(row: any): ExecutionInvocationRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    sprintId: row.sprint_id,
    taskId: row.task_id,
    sprintRunId: row.sprint_run_id,
    dispatchId: row.dispatch_id,
    taskRunId: row.task_run_id,
    attentionItemId: row.attention_item_id,
    providerInvocationId: row.provider_invocation_id,
    type: row.type,
    status: row.status,
    provider: row.provider,
    model: row.model,
    systemPrompt: row.system_prompt,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    errorMessage: row.error_message,
    lastErrorCategory: row.last_error_category ?? null,
    lastErrorMessage: row.last_error_message ?? null,
    lastRetryAfterIso: row.last_retry_after_iso,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapExecutionInvocationMessageRow(row: any): ExecutionInvocationMessageRecord {
  return {
    id: row.id,
    invocationId: row.invocation_id,
    role: row.role,
    contentMarkdown: row.content_markdown,
    toolCallsJson: row.tool_calls_json ? JSON.parse(row.tool_calls_json) : null,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
    createdAt: row.created_at,
  };
}
