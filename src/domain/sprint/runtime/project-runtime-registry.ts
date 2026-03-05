import type { DashboardStatus, ProjectId, SprintId } from "../../../contracts/app-types.js";

export interface ProjectRuntimeSnapshot {
  lastStatus: Partial<DashboardStatus> | null;
}

export class ProjectRuntimeRegistry {
  private snapshots: Map<string, ProjectRuntimeSnapshot> = new Map();

  private getKey(projectId: ProjectId, sprintId: SprintId): string {
    return `${projectId}::${sprintId}`;
  }

  getSnapshot(projectId: ProjectId, sprintId: SprintId): ProjectRuntimeSnapshot {
    const key = this.getKey(projectId, sprintId);
    let snapshot = this.snapshots.get(key);
    if (!snapshot) {
      snapshot = { lastStatus: null };
      this.snapshots.set(key, snapshot);
    }
    return snapshot;
  }

  setLastStatus(projectId: ProjectId, sprintId: SprintId, status: Partial<DashboardStatus> | null): void {
    const snapshot = this.getSnapshot(projectId, sprintId);
    snapshot.lastStatus = status;
  }

  getLastStatus(projectId: ProjectId, sprintId: SprintId): Partial<DashboardStatus> | null {
    return this.getSnapshot(projectId, sprintId).lastStatus;
  }

  getAllSnapshots(): ProjectRuntimeSnapshot[] {
    return Array.from(this.snapshots.values());
  }
}
