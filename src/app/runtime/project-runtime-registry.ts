import type { DashboardStatus } from "../../contracts/app-types.js";

export interface ProjectRuntimeScope {
  projectId: string;
  sprintId: string;
}

export interface ProjectRuntimeData {
  lastStatus: Partial<DashboardStatus> | null;
}

export class ProjectRuntimeRegistry {
  private registries = new Map<string, ProjectRuntimeData>();
  private activeScope: ProjectRuntimeScope | null = null;

  private getRegistryKey(scope: ProjectRuntimeScope): string {
    return `${scope.projectId}:${scope.sprintId}`;
  }

  public getRegistry(scope: ProjectRuntimeScope): ProjectRuntimeData {
    const key = this.getRegistryKey(scope);
    if (!this.registries.has(key)) {
      this.registries.set(key, { lastStatus: { subtasks: [], timestamp: null } });
    }
    return this.registries.get(key)!;
  }

  public setActiveScope(scope: ProjectRuntimeScope | null): void {
    this.activeScope = scope;
  }

  public getActiveScope(): ProjectRuntimeScope | null {
    return this.activeScope;
  }

  public getActiveRegistry(): ProjectRuntimeData | null {
    if (!this.activeScope) {
      return null;
    }
    return this.getRegistry(this.activeScope);
  }
}
