import type { Subtask } from "./subtask-types.js";
import type { ExecutionDashboardSnapshot } from "./execution-enums-types.js";
import type { GitTrackingStatus } from "./git-tracking-types.js";

export interface DashboardStatus {
  project_id?: string;
  sprint_id?: string;
  sprint_number?: number;
  source_id?: string;
  repo_path?: string;
  feature_branch?: string;
  subtasks: Subtask[];
  reportText?: string;
  statusTable?: string;
  instructions?: string;
  timestamp: string | null;
}

export interface DashboardStats {
  total: number;
  running: number;
  codingCompleted: number;
  completed: number;
  failed: number;
  ci: number;
  qa: number;
  automerge: number;
  merged: number;
  mergeBlocked: number;
  mergeConflicts: number;
}

export interface DashboardStatusSnapshot {
  project_id?: string;
  sprint_id?: string;
  sprint_number?: number;
  source_id?: string;
  repo_path?: string;
  feature_branch?: string;
  subtasks: Subtask[];
  reportText?: string;
  statusTable?: string;
  instructions?: string;
  timestamp: string | null;
}

export interface ProjectLiveDashboardSnapshot {
  /** Owned by `ProjectManagementRepository`. Mutated when a project is selected or created. */
  projectId: string | null;
  /** Owned by `ProjectManagementRepository`. Mutated when a sprint is selected or changed. */
  selectedSprintId: string | null;
  /** Owned by `ProjectRuntimeRepository`. Mutated when task states change, a sprint is run, or orchestration loop updates progress. */
  status: DashboardStatus;
  /** Owned by `ExecutionRepository` (via `getProjectExecutionSnapshot`). Mutated when sprint runs are dispatched, worker states change, or attention items are created/claimed. */
  execution: ExecutionDashboardSnapshot;
  /** Owned by the external git system. Mutated when local branches or upstream changes are detected. */
  gitStatus: GitTrackingStatus | null;
  /** Error state for git tracking. Mutated when external git/ci fails to load. */
  gitStatusError: string | null;
  /** Owned by the server assembly module. Mutated upon every assembly call to track the snapshot timestamp. */
  updatedAt: string | null;
}
