import type {
  ProjectLiveDashboardSnapshot,
  DashboardStatus,
  ExecutionDashboardSnapshot,
  GitTrackingStatus,
} from "../../contracts/app-types.js";
import type { ProjectManagementRepository } from "../../repositories/project-management-repository.js";
import type { ProjectRuntimeRepository } from "../../repositories/project-runtime-repository.js";

export interface ProjectLiveSnapshotDeps {
  projectManagementRepository: ProjectManagementRepository;
  projectRuntimeRepository: ProjectRuntimeRepository;
  getProjectExecutionSnapshot: (projectId: string) => ExecutionDashboardSnapshot;
  getGitStatus: () => Promise<GitTrackingStatus>;
}

/**
 * The unified assembly path for the Live snapshot.
 *
 * Boundary Contract:
 * - SQLite is the absolute source of truth.
 * - The server assembles the snapshot (this module).
 * - Websockets transport committed snapshot changes.
 * - The browser renders the snapshot without reconciling competing sources.
 *
 * Field Ownership & Mutation Triggers:
 * - `projectId`: Owned by `ProjectManagementRepository`. Mutated when a project is selected or created.
 * - `selectedSprintId`: Owned by `ProjectManagementRepository`. Mutated when a sprint is selected or changed.
 * - `status`: Owned by `ProjectRuntimeRepository`. Mutated when task states change, a sprint is run, or orchestration loop updates progress.
 * - `execution`: Owned by `ExecutionRepository` (via `getProjectExecutionSnapshot`). Mutated when sprint runs are dispatched, worker states change, or attention items are created/claimed.
 * - `gitStatus` / `gitStatusError`: Owned by the external git system. Mutated when local branches or upstream changes are detected.
 * - `updatedAt`: Owned by this assembly module. Mutated upon every assembly call to track the snapshot timestamp.
 */
export async function getProjectLiveSnapshot(
  deps: ProjectLiveSnapshotDeps,
  projectIdHint?: string | null,
): Promise<ProjectLiveDashboardSnapshot> {
  const projectId = typeof projectIdHint === "string" && projectIdHint.trim().length > 0
    ? projectIdHint.trim()
    : deps.projectManagementRepository.getSelectedProjectId();

  if (!projectId) {
    return {
      projectId: null,
      selectedSprintId: null,
      status: { subtasks: [], timestamp: null },
      execution: {
        projectId: null,
        projectName: null,
        sprintRuns: [],
        taskDispatches: [],
        connections: [],
        primaryAssignedWorker: null,
        overflowAssignedWorkers: [],
        attentionItems: [],
        recentEvents: [],
        updatedAt: null,
      },
      gitStatus: null,
      gitStatusError: null,
      updatedAt: null,
    };
  }

  const selectedSprintId = deps.projectManagementRepository.listSprints(projectId).selectedSprintId ?? null;
  const status = deps.projectRuntimeRepository.getProjectStatus(projectId, selectedSprintId);
  const execution = deps.getProjectExecutionSnapshot(projectId);

  let gitStatus: GitTrackingStatus | null = null;
  let gitStatusError: string | null = null;
  try {
    gitStatus = await deps.getGitStatus();
  } catch (error) {
    gitStatusError = error instanceof Error
      ? error.message
      : "Unable to load git/ci/pr tracking.";
  }

  return {
    projectId,
    selectedSprintId,
    status,
    execution,
    gitStatus,
    gitStatusError,
    updatedAt: new Date().toISOString(),
  };
}
