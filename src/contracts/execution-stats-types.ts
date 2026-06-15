import type { ProviderInvocationPurpose } from "./execution-types.js";
import type { ProviderId } from "./provider-types.js";

export interface ExecutionSprintRunSummary {
  id: string;
  projectId: string;
  sprintId: string;
  sprintName: string;
  sprintNumber: number | null;
  status: string;
  triggerType: string;
  triggeredBy: string | null;
  executorMode: string;
  startedAt: string | null;
  finishedAt: string | null;
  lastHeartbeatAt: string | null;
  createdAt: string;
  activeLeaseOwnerKey: string | null;
  activeLeaseExpiresAt: string | null;
  humanIntervention: ExecutionHumanInterventionSummary | null;
  usage?: ExecutionUsageTotals;
}

export interface ExecutionHumanInterventionSummary {
  title: string;
  reason: string;
  instructions: string;
  attentionType: string | null;
  severity: string | null;
  ownerType: string | null;
}

export interface ExecutionTaskDispatchSummary {
  id: string;
  projectId: string;
  sprintId: string;
  sprintRunId: string;
  sprintName: string;
  sprintNumber: number | null;
  taskId: string;
  taskKey: string;
  taskTitle: string;
  status: string;
  executorType: string;
  priority: number;
  connectionId: string | null;
  connectionDisplayName: string | null;
  connectionRole: string | null;
  taskRunId: string | null;
  taskRunState: string | null;
  provider: string | null;
  sessionId: string | null;
  sessionName: string | null;
  workerBranch: string | null;
  prUrl: string | null;
  queuedAt: string;
  claimedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastHeartbeatAt: string | null;
  errorMessage: string | null;
  activeLeaseOwnerKey: string | null;
  activeLeaseExpiresAt: string | null;
  usage?: ExecutionUsageTotals;
}

export interface ExecutionRuntimeEventSummary {
  id: string;
  scopeType: "task_run" | "sprint_run";
  taskRunId: string | null;
  sprintRunId: string | null;
  dispatchId: string | null;
  projectId: string;
  sprintId: string;
  sprintName: string;
  sprintNumber: number | null;
  sprintRunStatus: string | null;
  taskId: string | null;
  taskKey: string | null;
  taskTitle: string | null;
  taskRunState: string | null;
  eventType: string;
  originator: string | null;
  sourceEventKey: string | null;
  provider: string | null;
  sessionId: string | null;
  sessionName: string | null;
  workerBranch: string | null;
  prUrl: string | null;
  connectionId: string | null;
  connectionDisplayName: string | null;
  connectionRole: string | null;
  createdAt: string;
  payload: Record<string, unknown> | null;
}

export type ExecutionTaskRunEventSummary = ExecutionRuntimeEventSummary;

export interface ExecutionConnectionSummary {
  id: string;
  connectionKey: string;
  displayName: string;
  role: string;
  transport: string;
  status: string;
  model: string | null;
  instruction: string | null;
  labels: string[];
  listenMode: boolean;
  machineName: string | null;
  platform: string | null;
  arch: string | null;
  localExecutionRuntime: string | null;
  lastHeartbeatAt: string | null;
  projectIds: string[];
  activeProjectIds: string[];
  tasksRunCount: number;
  threadCount: number;
  messageCount: number;
  pendingInboxCount: number;
  activeDispatchCount: number;
}

export interface ExecutionAssignedWorkerSummary {
  assignmentId: string;
  workerEndpointId: string | null;
  workerEndpointKey: string;
  workerEndpointType: string;
  workerDisplayName: string;
  connectionId: string | null;
  connectionKey: string | null;
  transport: string | null;
  assignmentRole: string;
  status: string;
  assignedAt: string;
  lastAffinityAt: string;
  workerStatus: string | null;
  canSuperviseProjects: boolean;
  canExecuteTasks: boolean;
}

export interface ExecutionAttentionItemSummary {
  id: string;
  sprintId: string | null;
  taskId: string | null;
  sprintRunId: string | null;
  dispatchId: string | null;
  attentionType: string;
  severity: string;
  ownerType: string;
  status: string;
  assignedWorkerEndpointId: string | null;
  title: string;
  summaryMarkdown: string;
  payload: Record<string, unknown> | null;
  openedAt: string;
  claimedAt: string | null;
  resolvedAt: string | null;
  updatedAt: string;
}

export interface ExecutionUsageTotals {
  invocationCount: number;
  activeTimeMs: number;
  wallTimeMs: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  reportedInvocationCount: number;
  estimatedInvocationCount: number;
  unavailableInvocationCount: number;
  unsupportedInvocationCount: number;
}

export interface ExecutionInvocationStatusCounts {
  completed: number;
  failed: number;
  cancelled: number;
  running: number;
  paused: number;
}

export interface ExecutionDurationStats {
  sampleCount: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}

export interface ExecutionModelStatsSummary {
  id: string;
  provider: string;
  model: string | null;
  label: string;
  usage: ExecutionUsageTotals;
  statusCounts: ExecutionInvocationStatusCounts;
  successRate: number | null;
  duration: ExecutionDurationStats;
  lastActivityAt: string | null;
}

export interface ExecutionGitMetrics {
  insertions: number;
  deletions: number;
  filesChanged: number;
  prCount: number;
  mergedCount: number;
  mergeConflictCount: number;
}

export interface ExecutionGitStatsEntitySummary {
  id: string;
  label: string;
  secondaryLabel: string | null;
  metrics: ExecutionGitMetrics;
}

export interface ExecutionGitStatsBucketSummary {
  bucketStart: string;
  bucketEnd: string;
  label: string;
  metrics: ExecutionGitMetrics;
}

export interface ExecutionGitStatsSummary {
  totals: ExecutionGitMetrics;
  buckets: ExecutionGitStatsBucketSummary[];
  tasks: ExecutionGitStatsEntitySummary[];
  sprints: ExecutionGitStatsEntitySummary[];
}

export interface ExecutionUsageBucketSummary {
  bucketStart: string;
  bucketEnd: string;
  label: string;
  usage: ExecutionUsageTotals;
}

export interface ExecutionStatsEntitySummary {
  id: string;
  label: string;
  secondaryLabel: string | null;
  status: string | null;
  purpose: ProviderInvocationPurpose | null;
  provider: ProviderId | string | null;
  usage: ExecutionUsageTotals;
  lastActivityAt: string | null;
}
