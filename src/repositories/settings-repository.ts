import type { DashboardSettings, ExternalSettingsHints, VirtualWorkerProvider } from "../contracts/app-types.js";
import type {
  EffectiveSettingsResponse,
  ProjectSettings,
  ProjectSettingsOverride,
  SprintSettingsOverride,
  SystemSettings,
} from "../contracts/settings-scope-types.js";
import { SettingsDbStorage } from "./settings-db-storage.js";
import {
  buildDefaultProjectSettings,
  buildDefaultSystemSettings,
  resolveDashboardSettings,
  resolveProjectSettings,
  sanitizeSystemSettings,
  systemSettingsToDashboardSettings,
  toProjectSettingsOverride,
  toSprintSettingsOverride,
} from "../services/settings-resolution-service.js";
import { DEFAULT_VIRTUAL_WORKER_MODELS } from "./settings-defaults.js";

export class SettingsRepository {
  private readonly storage: SettingsDbStorage;
  private readonly externalHints: ExternalSettingsHints | undefined;

  constructor(dbPath?: string, externalHints?: ExternalSettingsHints) {
    this.storage = new SettingsDbStorage(dbPath);
    this.externalHints = externalHints;
  }

  getSystemSettings(): SystemSettings {
    const payload = this.storage.readSystemPayload();
    if (!payload) {
      return buildDefaultSystemSettings(this.externalHints);
    }

    try {
      return sanitizeSystemSettings(JSON.parse(payload), this.externalHints);
    } catch {
      return buildDefaultSystemSettings(this.externalHints);
    }
  }

  saveSystemSettings(input: SystemSettings): SystemSettings {
    const normalized = sanitizeSystemSettings(input, this.externalHints);
    this.storage.writeSystemPayload(JSON.stringify(normalized));
    return normalized;
  }

  getProjectSettings(projectId: string): ProjectSettingsOverride {
    const payload = this.storage.readProjectPayload(projectId);
    if (!payload) {
      return {};
    }

    try {
      return JSON.parse(payload) as ProjectSettingsOverride;
    } catch {
      return {};
    }
  }

  saveProjectSettings(projectId: string, patch: ProjectSettingsOverride): ProjectSettingsOverride {
    const base = this.getSystemSettings().defaults;
    const normalized = toProjectSettingsOverride(base, patch, this.externalHints);
    this.storage.writeProjectPayload(projectId, JSON.stringify(normalized));
    return normalized;
  }

  resetProjectSettings(projectId: string): void {
    this.storage.deleteProjectPayload(projectId);
  }

  getSprintSettings(sprintId: string): SprintSettingsOverride {
    const payload = this.storage.readSprintPayload(sprintId);
    if (!payload) {
      return {};
    }

    try {
      return JSON.parse(payload) as SprintSettingsOverride;
    } catch {
      return {};
    }
  }

  saveSprintSettings(sprintId: string, baseProjectSettings: ProjectSettings, patch: SprintSettingsOverride): SprintSettingsOverride {
    const normalized = toSprintSettingsOverride(baseProjectSettings, patch, this.externalHints);
    this.storage.writeSprintPayload(sprintId, JSON.stringify(normalized));
    return normalized;
  }

  resetSprintSettings(sprintId: string): void {
    this.storage.deleteSprintPayload(sprintId);
  }

  resetAllData(): void {
    this.storage.resetAllData();
  }

  resolveProjectDashboardSettings(projectId: string): EffectiveSettingsResponse {
    return resolveDashboardSettings({
      systemSettings: this.getSystemSettings(),
      projectOverride: this.getProjectSettings(projectId),
    });
  }

  resolveSprintDashboardSettings(projectId: string, sprintId: string): EffectiveSettingsResponse {
    return resolveDashboardSettings({
      systemSettings: this.getSystemSettings(),
      projectOverride: this.getProjectSettings(projectId),
      sprintOverride: this.getSprintSettings(sprintId),
    });
  }

  getProjectResolvedSettings(projectId: string): ProjectSettings {
    return resolveProjectSettings(this.getSystemSettings(), this.getProjectSettings(projectId));
  }

  getDefaultDashboardSettings(): DashboardSettings {
    return systemSettingsToDashboardSettings(this.getSystemSettings());
  }
}

export { DEFAULT_DASHBOARD_SETTINGS } from "./settings-defaults.js";
