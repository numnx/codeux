export interface SprintPreviewSettings {
  enabled: boolean;
  showInAppBrowser: boolean;
  autoStartOnRunningSprint: boolean;
  rebuildOnTaskCompletion: boolean;
  rebuildOnSprintCompletion: boolean;
  autoStopOnTerminalSprint: boolean;
  maxConcurrentContainers: number;
  hostPortRangeStart: number;
  hostPortRangeEnd: number;
  containerAppPort: number;
  startupScriptPath: string;
}

export type SprintPreviewSessionStatus = "stopped" | "starting" | "running" | "error";

export type SprintPreviewHealthStatus = "unknown" | "healthy" | "unreachable";

export type SprintPreviewStartupMode = "auto" | "script";

export interface SprintPreviewSession {
  id: string;
  projectId: string;
  sprintId: string;
  projectName: string;
  sprintName: string;
  sprintNumber: number | null;
  status: SprintPreviewSessionStatus;
  hostPort: number | null;
  containerAppPort: number;
  containerId: string | null;
  containerName: string | null;
  worktreePath: string | null;
  featureBranch: string | null;
  startupScriptPath: string;
  startupMode: SprintPreviewStartupMode;
  installCommand: string | null;
  buildCommand: string | null;
  runCommand: string | null;
  lastCompletedTaskCount: number;
  lastSeenSprintStatus: string | null;
  lastKnownPath: string | null;
  healthStatus: SprintPreviewHealthStatus;
  lastError: string | null;
  lastBuildAt: string | null;
  lastStartedAt: string | null;
  lastStoppedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SprintPreviewScript {
  projectId: string;
  sprintId: string;
  path: string;
  exists: boolean;
  mode: SprintPreviewStartupMode;
  content: string;
  detectedInstallCommand: string | null;
  detectedBuildCommand: string | null;
  detectedRunCommand: string | null;
}
