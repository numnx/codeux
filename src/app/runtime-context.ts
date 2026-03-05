import type { DashboardSettings, DashboardStatus, Settings } from "../contracts/app-types.js";
import { ProjectRuntimeRegistry } from "../domain/sprint/runtime/project-runtime-registry.js";

export interface RuntimeContext {
  settings: Settings;
  dashboardSettings: DashboardSettings | undefined;
  consecutiveFailures: number;
  dashboardRuntimePort: number | null;
  registry: ProjectRuntimeRegistry;
  getLastStatus(projectId?: string, sprintId?: string): Partial<DashboardStatus> | null;
  updateLastStatus(projectId: string, sprintId: string, status: Partial<DashboardStatus> | null): void;
  getAllActiveStatus(): Partial<DashboardStatus>[];
}

export class DefaultRuntimeContext implements RuntimeContext {
  private _settings: Settings = { maxFailures: 5 };
  private _dashboardSettings: DashboardSettings | undefined = undefined;
  private _consecutiveFailures: number = 0;
  private _dashboardRuntimePort: number | null = null;

  public registry = new ProjectRuntimeRegistry();

  get settings(): Settings {
    return this._settings;
  }

  set settings(value: Settings) {
    this._settings = value;
  }

  get dashboardSettings(): DashboardSettings | undefined {
    return this._dashboardSettings;
  }

  set dashboardSettings(value: DashboardSettings | undefined) {
    this._dashboardSettings = value;
  }

  get consecutiveFailures(): number {
    return this._consecutiveFailures;
  }

  set consecutiveFailures(value: number) {
    this._consecutiveFailures = value;
  }

  getLastStatus(projectId?: string, sprintId?: string): Partial<DashboardStatus> | null {
    if (projectId && sprintId) {
      return this.registry.getSnapshot(projectId, sprintId).lastStatus;
    }
    // Dashboard status relies on a fallback for single-project environments if IDs aren't known.
    // To strictly enforce scoping and avoid race conditions, we return null if IDs are omitted.
    return null;
  }

  updateLastStatus(projectId: string, sprintId: string, status: Partial<DashboardStatus> | null): void {
    if (!projectId || !sprintId) return;
    this.registry.setLastStatus(projectId, sprintId, status);
  }

  getAllActiveStatus(): Partial<DashboardStatus>[] {
    const statuses: Partial<DashboardStatus>[] = [];
    for (const snap of this.registry.getAllSnapshots()) {
      if (snap.lastStatus) {
        statuses.push(snap.lastStatus);
      }
    }
    return statuses;
  }

  get dashboardRuntimePort(): number | null {
    return this._dashboardRuntimePort;
  }

  set dashboardRuntimePort(value: number | null) {
    this._dashboardRuntimePort = value;
  }
}
