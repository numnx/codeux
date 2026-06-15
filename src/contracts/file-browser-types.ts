export type FileBrowserSessionStatus = "stopped" | "starting" | "running" | "error";

export interface FileBrowserSession {
  id: string;
  projectId: string;
  sprintId: string;
  projectName: string;
  sprintName: string;
  sprintNumber: number | null;
  status: FileBrowserSessionStatus;
  containerId: string | null;
  containerName: string | null;
  workspacePath: string | null;
  featureBranch: string | null;
  defaultBranch: string | null;
  lastCompletedTaskCount: number;
  lastSeenSprintStatus: string | null;
  lastError: string | null;
  lastBuildAt: string | null;
  lastStartedAt: string | null;
  lastStoppedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileBrowserTreeNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileBrowserTreeNode[];
}

export interface FileBrowserTree {
  sessionId: string;
  root: FileBrowserTreeNode[];
  fileCount: number;
  truncated: boolean;
}

export interface FileBrowserFileContent {
  path: string;
  content: string;
  encoding: "utf8";
  size: number;
  truncated: boolean;
  binary: boolean;
  language: string | null;
}

export type FileBrowserChangeStatus = "added" | "modified" | "deleted" | "renamed";

export interface FileBrowserChange {
  path: string;
  oldPath: string | null;
  status: FileBrowserChangeStatus;
  additions: number;
  deletions: number;
}

export interface FileBrowserChangeSet {
  sessionId: string;
  featureBranch: string;
  defaultBranch: string;
  available: boolean;
  reason: string | null;
  files: FileBrowserChange[];
}

export interface FileBrowserDiff {
  path: string;
  oldPath: string | null;
  status: FileBrowserChangeStatus;
  original: string | null;
  modified: string | null;
  binary: boolean;
  language: string | null;
}

export interface LocalDirectoryBrowserEntry {
  name: string;
  path: string;
}

export interface LocalDirectoryBrowserResponse {
  currentPath: string;
  parentPath: string | null;
  rootPath: string;
  homePath: string;
  directories: LocalDirectoryBrowserEntry[];
}
