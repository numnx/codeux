import type {
  ProviderInvocationPurpose,
  ProviderInvocationStatus,
  ProviderInvocationSource,
  TokenUsageSource
} from "../../contracts/execution-types.js";
import type { ExecutionInvocationStatus } from "../../contracts/invocation-types.js";
import type { ProviderErrorCategory } from "../../shared/providers/provider-error-classifier.js";

const PROVIDER_INVOCATION_PURPOSES = ["task_coding", "ci_fix", "merge_conflict", "planning", "worker_reply", "qa_review", "clarification_reply", "dashboard_reply"] as const;
export function assertProviderInvocationPurpose(v: string | null | undefined): ProviderInvocationPurpose {
  if (!v) throw new Error(`Missing provider invocation purpose`);
  if (!(PROVIDER_INVOCATION_PURPOSES as readonly string[]).includes(v)) throw new Error(`Unknown provider invocation purpose: ${v}`);
  return v as ProviderInvocationPurpose;
}

const PROVIDER_INVOCATION_STATUSES = ["running", "completed", "failed", "cancelled"] as const;
export function assertProviderInvocationStatus(v: string | null | undefined): ProviderInvocationStatus {
  if (!v) throw new Error(`Missing provider invocation status`);
  if (!(PROVIDER_INVOCATION_STATUSES as readonly string[]).includes(v)) throw new Error(`Unknown provider invocation status: ${v}`);
  return v as ProviderInvocationStatus;
}

const TOKEN_USAGE_SOURCES = ["reported", "estimated", "unsupported", "unavailable"] as const;
export function assertTokenUsageSource(v: string | null | undefined): TokenUsageSource {
  if (!v) throw new Error(`Missing token usage source`);
  if (!(TOKEN_USAGE_SOURCES as readonly string[]).includes(v)) throw new Error(`Unknown token usage source: ${v}`);
  return v as TokenUsageSource;
}

const PROVIDER_INVOCATION_SOURCES = ["internal", "EXTERNAL_API"] as const;
export function assertProviderInvocationSource(v: string | null | undefined): ProviderInvocationSource {
  if (!v) throw new Error(`Missing provider invocation source`);
  if (!(PROVIDER_INVOCATION_SOURCES as readonly string[]).includes(v)) throw new Error(`Unknown provider invocation source: ${v}`);
  return v as ProviderInvocationSource;
}

const EXECUTION_INVOCATION_STATUSES = ["running", "completed", "failed", "cancelled", "paused"] as const;
export function assertExecutionInvocationStatus(v: string | null | undefined): ExecutionInvocationStatus {
  if (!v) throw new Error(`Missing execution invocation status`);
  if (!(EXECUTION_INVOCATION_STATUSES as readonly string[]).includes(v)) throw new Error(`Unknown execution invocation status: ${v}`);
  return v as ExecutionInvocationStatus;
}

const PROVIDER_ERROR_CATEGORIES = ["QUOTA_EXHAUSTED", "AUTH_FAILURE", "RATE_LIMITED", "PROVIDER_NOT_FOUND", "UNKNOWN"] as const;
export function assertProviderErrorCategory(v: string | null | undefined): ProviderErrorCategory | null {
  if (!v) return null;
  if (!(PROVIDER_ERROR_CATEGORIES as readonly string[]).includes(v)) throw new Error(`Unknown provider error category: ${v}`);
  return v as ProviderErrorCategory;
}

const INVOCATION_MESSAGE_ROLES = ["system", "user", "assistant", "tool"] as const;
export function assertInvocationMessageRole(v: string | null | undefined): "system" | "user" | "assistant" | "tool" {
  if (!v) throw new Error(`Missing invocation message role`);
  if (!(INVOCATION_MESSAGE_ROLES as readonly string[]).includes(v)) throw new Error(`Unknown invocation message role: ${v}`);
  return v as "system" | "user" | "assistant" | "tool";
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

export interface OverviewTelemetryProjectSummaryRow {
  project_id: string;
  project_name: string;
  sprint_id: string;
  sprint_name: string;
  sprint_number: number | string | null;
  sprint_run_id: string;
  sprint_run_status: string;
  active_dispatch_count: number | string;
  running_dispatch_count: number | string;
  updated_at: string | null;
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
  execution_mode: string | null;
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
  tool_call_count?: number | string;
  jules_tokens: number | string;
  usage_source: string;
  invocation_source: string;
  cost_cents: number | string | null;
  connection_id: string | null;
  raw_usage_json?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ProjectAttentionSummaryRow {
  id: string;
  project_id: string;
  sprint_id: string | null;
  sprint_run_id: string | null;
  attention_type: string;
  severity: string;
  owner_type: string;
  status: string;
  title: string;
  summary_markdown: string;
  payload_json: string | null;
  updated_at: string;
}
export interface ExecutionInvocationRow {
  id: string;
  project_id: string;
  sprint_id: string | null;
  task_id: string | null;
  sprint_run_id: string | null;
  dispatch_id: string | null;
  task_run_id: string | null;
  attention_item_id: string | null;
  provider_invocation_id: string | null;
  type: string;
  status: string;
  provider: string | null;
  model: string | null;
  system_prompt: string | null;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  last_error_category: string | null;
  last_error_message: string | null;
  last_retry_after_iso: string | null;
  message_count: number | string;
  last_message_at: string | null;
  invocation_source?: string;
  agent_preset_id?: string | null;
  input_tokens?: number | string | null;
  cached_input_tokens?: number | string | null;
  output_tokens?: number | string | null;
  total_tokens?: number | string | null;
  sprint_number?: number | string | null;
  sprint_name?: string | null;
  sprint_slug?: string | null;
  task_key?: string | null;
  task_title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutionInvocationMessageRow {
  id: string;
  invocation_id: string;
  role: string;
  content_markdown: string;
  tool_calls_json: string | null;
  metadata_json: string | null;
  created_at: string;
}

export interface InvocationCountRow {
  count: number;
}

export interface InvocationSummaryRow {
  totalInvocations: number;
  runningCount: number;
  failedCount: number;
  completedCount: number;
  cancelledCount: number;
  pausedCount: number;
  totalTokens: number | null;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  totalCachedTokens: number | null;
  avgDurationMs: number | null;
}

export interface InvocationP95Row {
  duration_ms: number;
}

export interface InvocationSprintRow {
  sprintId: string;
  status: string;
  count: number;
}

export interface InvocationApiRow {
  type: string;
  purpose: string;
  provider: string;
  finishedAt: string | null;
  duration_ms: number | null;
  count: number;
}

export interface InvocationErrorRow {
  msg: string;
  status: string;
  count: number;
}

export interface InvocationPurposeRow {
  purpose: string;
}

export interface InvocationProviderRow {
  provider: string;
}
