import {
  ProviderInvocationPurpose,
  ProviderInvocationStatus,
  TokenUsageSource,
  SprintRunStatus,
  SprintRunTriggerType,
  SprintRunExecutorMode,
  TaskDispatchExecutorType,
  TaskDispatchStatus,
  ExecutionInvocationStatus,
} from "../../contracts/execution-types.js";
import { ProviderErrorCategory } from "../../shared/providers/provider-error-classifier.js";

export interface ExecutionSprintRunSummaryRow {
  id: string;
  project_id: string;
  sprint_id: string;
  sprint_name: string;
  sprint_number: number | string | null;
  status: SprintRunStatus;
  trigger_type: SprintRunTriggerType;
  triggered_by: string | null;
  executor_mode: SprintRunExecutorMode;
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
  status: TaskDispatchStatus;
  executor_type: TaskDispatchExecutorType;
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
  sprint_run_status: SprintRunStatus;
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
  sprint_run_status: SprintRunStatus | null;
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
  purpose: ProviderInvocationPurpose;
  status: ProviderInvocationStatus;
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
  usage_source: TokenUsageSource;
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
  status: ExecutionInvocationStatus;
  provider: string | null;
  model: string | null;
  system_prompt: string | null;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  last_error_category: ProviderErrorCategory | null;
  last_error_message: string | null;
  last_retry_after_iso: string | null;
  message_count: number | string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutionInvocationMessageRow {
  id: string;
  invocation_id: string;
  role: "system" | "user" | "assistant" | "tool";
  content_markdown: string;
  tool_calls_json: string | null;
  metadata_json: string | null;
  created_at: string;
}

export interface UsageAggregationRow {
  task_id?: string | null;
  sprint_run_id?: string | null;
  invocation_count: number | string;
  duration_ms: number | string | null;
  input_tokens: number | string;
  cached_input_tokens: number | string;
  output_tokens: number | string;
  reasoning_output_tokens: number | string;
  total_tokens: number | string;
  reported_invocation_count: number | string;
  estimated_invocation_count: number | string;
  unsupported_invocation_count: number | string;
  unavailable_invocation_count: number | string;
}

