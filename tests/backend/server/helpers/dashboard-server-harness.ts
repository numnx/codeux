import { vi } from "vitest";
import express from "express";
import { setupDashboardServer } from "../../../../src/server/dashboard-server.js";
import type { DashboardServerOptions, DashboardServerHandle } from "../../../../src/server/dashboard-server.js";

export function buildMockDashboardOptions(overrides: Partial<DashboardServerOptions> = {}): DashboardServerOptions {
  return {
    app: overrides.app ?? express(),
    dashboardDir: overrides.dashboardDir ?? "/mock/dir",
    port: overrides.port ?? 3000,
    liveActivityCacheMs: overrides.liveActivityCacheMs ?? 1000,
    skipServerBinding: overrides.skipServerBinding ?? true,
    getStatus: overrides.getStatus ?? vi.fn().mockReturnValue({}),
    getLiveSnapshot: overrides.getLiveSnapshot ?? vi.fn().mockReturnValue({}),
    getProjectLiveSnapshot: overrides.getProjectLiveSnapshot ?? vi.fn().mockReturnValue({}),
    getExecutionSnapshot: overrides.getExecutionSnapshot ?? vi.fn().mockReturnValue({}),
    getProjectExecutionSnapshot: overrides.getProjectExecutionSnapshot ?? vi.fn().mockReturnValue({}),
    getProjectStatsSnapshot: overrides.getProjectStatsSnapshot ?? vi.fn().mockReturnValue({}),
    getOverviewTelemetrySnapshot: overrides.getOverviewTelemetrySnapshot ?? vi.fn().mockReturnValue({}),
    getLiveActivities: overrides.getLiveActivities ?? vi.fn().mockResolvedValue({}),
    getGitStatus: overrides.getGitStatus ?? vi.fn().mockResolvedValue({}),
    getExternalSettingsHints: overrides.getExternalSettingsHints ?? vi.fn().mockReturnValue({}),
    getSystemSettings: overrides.getSystemSettings ?? vi.fn().mockReturnValue({}),
    saveSystemSettings: overrides.saveSystemSettings ?? vi.fn(),
    resetDatabase: overrides.resetDatabase ?? vi.fn(),
    getProjectSettings: overrides.getProjectSettings ?? vi.fn().mockReturnValue({}),
    saveProjectSettings: overrides.saveProjectSettings ?? vi.fn(),
    resetProjectSettings: overrides.resetProjectSettings ?? vi.fn(),
    getProjectEffectiveSettings: overrides.getProjectEffectiveSettings ?? vi.fn().mockReturnValue({}),
    getSprintSettings: overrides.getSprintSettings ?? vi.fn().mockReturnValue({}),
    saveSprintSettings: overrides.saveSprintSettings ?? vi.fn(),
    resetSprintSettings: overrides.resetSprintSettings ?? vi.fn(),
    getSprintEffectiveSettings: overrides.getSprintEffectiveSettings ?? vi.fn().mockReturnValue({}),
    listProjects: overrides.listProjects ?? vi.fn().mockReturnValue({ projects: [], selectedProjectId: null }),
    createProject: overrides.createProject ?? vi.fn(),
    getProject: overrides.getProject ?? vi.fn(),
    updateProject: overrides.updateProject ?? vi.fn(),
    deleteProject: overrides.deleteProject ?? vi.fn(),
    selectProject: overrides.selectProject ?? vi.fn(),
    selectSprint: overrides.selectSprint ?? vi.fn(),
    listSprints: overrides.listSprints ?? vi.fn().mockReturnValue({ sprints: [], selectedSprintId: null }),
    createSprint: overrides.createSprint ?? vi.fn(),
    updateSprint: overrides.updateSprint ?? vi.fn(),
    deleteSprint: overrides.deleteSprint ?? vi.fn(),
    importSprintFromMarkdown: overrides.importSprintFromMarkdown ?? vi.fn(),
    exportSprintToMarkdown: overrides.exportSprintToMarkdown ?? vi.fn(),
    listTasks: overrides.listTasks ?? vi.fn().mockReturnValue([]),
    createTask: overrides.createTask ?? vi.fn(),
    updateTask: overrides.updateTask ?? vi.fn(),
    deleteTask: overrides.deleteTask ?? vi.fn(),
    listConnections: overrides.listConnections ?? vi.fn().mockReturnValue([]),
    updateConnection: overrides.updateConnection ?? vi.fn(),
    listAgentPresets: overrides.listAgentPresets ?? vi.fn().mockReturnValue([]),
    createAgentPreset: overrides.createAgentPreset ?? vi.fn(),
    updateAgentPreset: overrides.updateAgentPreset ?? vi.fn(),
    deleteAgentPreset: overrides.deleteAgentPreset ?? vi.fn(),
    listConversationThreads: overrides.listConversationThreads ?? vi.fn().mockReturnValue([]),
    createConversationThread: overrides.createConversationThread ?? vi.fn(),
    updateConversationThread: overrides.updateConversationThread ?? vi.fn(),
    deleteConversationThread: overrides.deleteConversationThread ?? vi.fn(),
    listConversationMessages: overrides.listConversationMessages ?? vi.fn().mockReturnValue([]),
    postConversationMessage: overrides.postConversationMessage ?? vi.fn(),
    rerunTask: overrides.rerunTask ?? vi.fn(),
    orchestrateSprint: overrides.orchestrateSprint ?? vi.fn(),
    pauseSprintRun: overrides.pauseSprintRun ?? vi.fn(),
    cancelSprintRun: overrides.cancelSprintRun ?? vi.fn(),
    forceCancelSprintRun: overrides.forceCancelSprintRun ?? vi.fn(),
    cancelTaskDispatch: overrides.cancelTaskDispatch ?? vi.fn(),
    forceCancelTaskDispatch: overrides.forceCancelTaskDispatch ?? vi.fn(),
    retryTaskDispatch: overrides.retryTaskDispatch ?? vi.fn(),
    listDockerContainers: overrides.listDockerContainers ?? vi.fn().mockResolvedValue([]),
    listSprintPreviewSessions: overrides.listSprintPreviewSessions ?? vi.fn().mockResolvedValue([]),
    getSprintPreviewSession: overrides.getSprintPreviewSession ?? vi.fn(),
    startSprintPreviewSession: overrides.startSprintPreviewSession ?? vi.fn(),
    rebuildSprintPreviewSession: overrides.rebuildSprintPreviewSession ?? vi.fn(),
    stopSprintPreviewSession: overrides.stopSprintPreviewSession ?? vi.fn(),
    getSprintPreviewScript: overrides.getSprintPreviewScript ?? vi.fn(),
    saveSprintPreviewScript: overrides.saveSprintPreviewScript ?? vi.fn(),
    getSprintPreviewLogs: overrides.getSprintPreviewLogs ?? vi.fn(),
    proxySprintPreviewRequest: overrides.proxySprintPreviewRequest ?? vi.fn(),
    ...overrides,
  };
}

export async function createDashboardHarness(overrides: Partial<DashboardServerOptions> = {}): Promise<{
  app: express.Express;
  options: DashboardServerOptions;
  handle: DashboardServerHandle;
}> {
  const app = express();
  app.use(express.json());
  const options = buildMockDashboardOptions({ ...overrides, app });
  const handle = await setupDashboardServer(options);
  return { app, options, handle };
}
