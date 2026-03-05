import type { DashboardSettings, DashboardStatus, Settings } from "../contracts/app-types.js";
import { ProjectRuntimeRegistry, ProjectRuntimeScope } from "./runtime/project-runtime-registry.js";

export interface RuntimeContext {
  settings: Settings;
  dashboardSettings: DashboardSettings | undefined;
  consecutiveFailures: number;
  dashboardRuntimePort: number | null;
  projectRuntimeRegistry: ProjectRuntimeRegistry;
  getLastStatus: (projectId: string, sprintId: string) => Partial<DashboardStatus> | null;
  setLastStatus: (projectId: string, sprintId: string, value: Partial<DashboardStatus> | null) => void;
  setActiveProjectScope: (scope: ProjectRuntimeScope | null) => void;
  getActiveProjectScope: () => ProjectRuntimeScope | null;
}

export class DefaultRuntimeContext implements RuntimeContext {
  private _settings: Settings = { maxFailures: 5 };
  private _dashboardSettings: DashboardSettings | undefined = undefined;
  private _consecutiveFailures: number = 0;
  private _dashboardRuntimePort: number | null = null;
  private _projectRuntimeRegistry = new ProjectRuntimeRegistry();

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

  get projectRuntimeRegistry(): ProjectRuntimeRegistry {
    return this._projectRuntimeRegistry;
  }

  setActiveProjectScope(scope: ProjectRuntimeScope | null): void {
    this._projectRuntimeRegistry.setActiveScope(scope);
  }

  getActiveProjectScope(): ProjectRuntimeScope | null {
    return this._projectRuntimeRegistry.getActiveScope();
  }

  getLastStatus(projectId: string, sprintId: string): Partial<DashboardStatus> | null {
    return this._projectRuntimeRegistry.getRegistry({ projectId, sprintId }).lastStatus;
  }

  setLastStatus(projectId: string, sprintId: string, value: Partial<DashboardStatus> | null): void {
    const registry = this._projectRuntimeRegistry.getRegistry({ projectId, sprintId });
    registry.lastStatus = value;
  }

  get dashboardRuntimePort(): number | null {
    return this._dashboardRuntimePort;
  }

  set dashboardRuntimePort(value: number | null) {
    this._dashboardRuntimePort = value;
  }
}
