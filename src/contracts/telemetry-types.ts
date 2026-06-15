import type { ExecutionHumanInterventionSummary, ExecutionRuntimeEventSummary } from "./execution-stats-types.js";

export interface OverviewTelemetryProjectSummary {
  projectId: string;
  projectName: string;
  sprintId: string;
  sprintName: string;
  sprintNumber: number | null;
  sprintRunId: string;
  sprintRunStatus: string;
  activeDispatchCount: number;
  runningDispatchCount: number;
  updatedAt: string | null;
  humanIntervention: ExecutionHumanInterventionSummary | null;
}

export interface OverviewTelemetrySnapshot {
  activeProjects: OverviewTelemetryProjectSummary[];
  attentionProjects: OverviewTelemetryProjectSummary[];
  recentEvents: ExecutionRuntimeEventSummary[];
  updatedAt: string | null;
}
