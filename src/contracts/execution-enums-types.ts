import type { ExecutionSprintRunSummary, ExecutionTaskDispatchSummary, ExecutionConnectionSummary, ExecutionAssignedWorkerSummary, ExecutionAttentionItemSummary, ExecutionRuntimeEventSummary } from "./execution-stats-types.js";

export interface ExecutionDashboardSnapshot {
  projectId: string | null;
  projectName: string | null;
  sprintRuns: ExecutionSprintRunSummary[];
  taskDispatches: ExecutionTaskDispatchSummary[];
  connections: ExecutionConnectionSummary[];
  primaryAssignedWorker: ExecutionAssignedWorkerSummary | null;
  overflowAssignedWorkers: ExecutionAssignedWorkerSummary[];
  attentionItems: ExecutionAttentionItemSummary[];
  recentEvents: ExecutionRuntimeEventSummary[];
  updatedAt: string | null;
}

export type ThinkingMode = "SMALL" | "MEDIUM" | "HIGH";

export type InvocationRoutingProfile = "GLOBAL" | "WORKER";

export type InvocationRoutingId =
  | "task_coding"
  | "planning"
  | "dashboard_reply"
  | "clarification_reply"
  | "qa_review"
  | "ci_fix"
  | "merge_conflict";

export type CliExecutionMode = "DOCKER" | "HOST";

export type FeaturePrAutoMergeMode = "OFF" | "CREATE_PR" | "WHEN_GREEN" | "ALWAYS";

export type WorkerExecutionMode = "VIRTUAL";

export type AgentRoutingMode = "MANUAL" | "ORCHESTRATOR";
