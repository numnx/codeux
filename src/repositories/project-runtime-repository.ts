import { randomUUID } from "crypto";
import * as path from "path";
import { DatabaseAdapter } from "./db/database-adapter.js";
import type { DashboardStatus, Subtask, SubtaskStatus } from "../contracts/app-types.js";
import { AppDbStorage } from "./app-db-storage.js";
import type { DashboardRealtimeMutationNotifier } from "../services/dashboard-realtime-service.js";
import { mapRuntimeStatusToPlanningStatus } from "../services/subtask-state-mapper.js";
import { RuntimeContextStore } from "./project-runtime/runtime-context-store.js";
import { RuntimeStatusSync } from "./project-runtime/runtime-status-sync.js";
import {
  RuntimeStatusProjection,
  ProjectRow,
  SprintRow,
} from "./project-runtime/runtime-status-projection.js";

function normalizePath(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return path.resolve(trimmed);
}

export class ProjectRuntimeRepository {
  private readonly db: DatabaseAdapter;
  private readonly runtimeContextStore: RuntimeContextStore;
  private readonly runtimeStatusProjection: RuntimeStatusProjection;
  private readonly runtimeStatusSync: RuntimeStatusSync;

  constructor(
    private readonly storage: AppDbStorage = new AppDbStorage(),
    private readonly realtimeNotifier?: DashboardRealtimeMutationNotifier,
  ) {
    this.db = storage.getDatabase();
    this.runtimeContextStore = new RuntimeContextStore(this.db);
    this.runtimeStatusProjection = new RuntimeStatusProjection(this.storage, this.db);
    this.runtimeStatusSync = new RuntimeStatusSync(
      this.db,
      this.runtimeContextStore,
      this.runtimeStatusProjection
    );
  }

  syncDashboardStatus(status: Partial<DashboardStatus> | null): DashboardStatus | null {
    if (!status) {
      return null;
    }

    const project = this.resolveProjectForStatus(status);
    if (!project) {
      return null;
    }

    const sprint = this.resolveSprintForStatus(project.id, status);

    this.runtimeStatusSync.syncDashboardStatus(status, project, sprint);

    this.realtimeNotifier?.scheduleProjectRuntimeStatusRefresh(project.id);

    return this.getProjectStatus(project.id, sprint?.id ?? null);
  }

  getSelectedProjectStatus(): DashboardStatus {
    const projectId = this.getSelectedProjectId();
    if (!projectId) {
      return { subtasks: [], timestamp: null };
    }
    const sprintId = this.getSelectedSprintId(projectId);
    return this.getProjectStatus(projectId, sprintId);
  }

  getProjectLiveStatus(projectId: string, preferredSprintId?: string | null): DashboardStatus {
    const sprintId = this.resolveLiveSprintId(projectId, preferredSprintId);
    return this.getProjectStatus(projectId, sprintId);
  }

  getSelectedProjectLiveStatus(): DashboardStatus {
    const projectId = this.getSelectedProjectId();
    if (!projectId) {
      return { subtasks: [], timestamp: null };
    }
    return this.getProjectLiveStatus(projectId);
  }

  getProjectStatus(projectId: string, explicitSprintId?: string | null): DashboardStatus {
    const sprintIdToLoad = explicitSprintId ?? this.getSelectedSprintId(projectId) ?? null;
    const context = sprintIdToLoad ? this.runtimeContextStore.getRuntimeContext(projectId, sprintIdToLoad) : null;
    return this.runtimeStatusProjection.buildProjectStatus(projectId, sprintIdToLoad, context);
  }

  getSelectedProjectRepoPath(fallbackPath: string): string {
    const status = this.getSelectedProjectLiveStatus();
    const repoPath = typeof status.repo_path === "string" ? status.repo_path.trim() : "";
    return repoPath.length > 0 ? repoPath : fallbackPath;
  }

  getSelectedSprintId(projectId: string): string | null {
    const row = this.db.prepare(`
      SELECT payload
      FROM app_settings
      WHERE key = ?
    `).get(`selected_sprint_id_${projectId}`) as { payload: string } | undefined;

    if (!row) {
      return null;
    }

    try {
      const parsed = JSON.parse(row.payload) as { sprintId?: string | null };
      return parsed.sprintId ?? null;
    } catch {
      return null;
    }
  }

  getSelectedProjectId(): string | null {
    const row = this.db.prepare(`
      SELECT payload
      FROM app_settings
      WHERE key = 'selected_project_id'
    `).get() as { payload: string } | undefined;

    if (!row) {
      return null;
    }

    try {
      const parsed = JSON.parse(row.payload) as { projectId?: string | null };
      return parsed.projectId ?? null;
    } catch {
      return null;
    }
  }

  private resolveProjectForStatus(status: Partial<DashboardStatus>): ProjectRow | null {
    if (typeof status.project_id === "string" && status.project_id.trim().length > 0) {
      const direct = this.db.prepare(`
        SELECT p.id, p.base_dir, ps.source_ref
        FROM projects p
        LEFT JOIN project_sources ps ON ps.project_id = p.id
        WHERE p.id = ?
        LIMIT 1
      `).get(status.project_id.trim()) as ProjectRow | undefined;
      if (direct) {
        return direct;
      }
    }

    const repoPath = normalizePath(typeof status.repo_path === "string" ? status.repo_path : null);
    const selectedProjectId = this.getSelectedProjectId();
    const rows = this.db.prepare(`
      SELECT p.id, p.base_dir, ps.source_ref
      FROM projects p
      LEFT JOIN project_sources ps ON ps.project_id = p.id
      ORDER BY p.updated_at DESC
    `).all() as unknown as ProjectRow[];

    if (repoPath) {
      const match = rows.find((row) => {
        const baseDir = normalizePath(row.base_dir);
        const sourceRef = normalizePath(row.source_ref);
        return baseDir === repoPath || sourceRef === repoPath;
      });
      if (match) {
        return match;
      }
    }

    if (selectedProjectId) {
      return rows.find((row) => row.id === selectedProjectId) || null;
    }

    return rows[0] || null;
  }

  private resolveSprintForStatus(projectId: string, status: Partial<DashboardStatus>): SprintRow | null {
    if (typeof status.sprint_id === "string" && status.sprint_id.trim().length > 0) {
      const direct = this.db.prepare(`
        SELECT id, number
        FROM sprints
        WHERE id = ? AND project_id = ?
        LIMIT 1
      `).get(status.sprint_id.trim(), projectId) as SprintRow | undefined;
      if (direct) {
        return direct;
      }
    }

    if (typeof status.sprint_number === "number") {
      const row = this.db.prepare(`
        SELECT id, number
        FROM sprints
        WHERE project_id = ? AND number = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `).get(projectId, status.sprint_number) as SprintRow | undefined;
      if (row) {
        return row;
      }
    }

    if (typeof status.feature_branch === "string" && status.feature_branch.trim().length > 0) {
      const row = this.db.prepare(`
        SELECT id, number
        FROM sprints
        WHERE project_id = ? AND feature_branch = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `).get(projectId, status.feature_branch.trim()) as SprintRow | undefined;
      if (row) {
        return row;
      }
    }

    return null;
  }

  private resolveLiveSprintId(projectId: string, preferredSprintId?: string | null): string | null {
    if (preferredSprintId) {
      const preferredActiveRow = this.db.prepare(`
        SELECT sr.sprint_id
        FROM sprint_runs sr
        WHERE sr.project_id = ?
          AND sr.sprint_id = ?
          AND sr.status IN ('queued', 'running', 'paused', 'cancel_requested')
        ORDER BY COALESCE(sr.last_heartbeat_at, sr.updated_at, sr.created_at) DESC, sr.rowid DESC
        LIMIT 1
      `).get(projectId, preferredSprintId) as { sprint_id: string } | undefined;
      if (preferredActiveRow) {
        return preferredActiveRow.sprint_id;
      }
    }

    const activeRow = this.db.prepare(`
      SELECT sr.sprint_id
      FROM sprint_runs sr
      WHERE sr.project_id = ?
        AND sr.status IN ('queued', 'running', 'paused', 'cancel_requested')
      ORDER BY COALESCE(sr.last_heartbeat_at, sr.updated_at, sr.created_at) DESC, sr.rowid DESC
      LIMIT 1
    `).get(projectId) as { sprint_id: string } | undefined;
    if (activeRow) {
      return activeRow.sprint_id;
    }

    if (preferredSprintId) {
      return preferredSprintId;
    }

    const selectedSprintId = this.getSelectedSprintId(projectId);
    if (selectedSprintId) {
      return selectedSprintId;
    }

    return null;
  }
}
