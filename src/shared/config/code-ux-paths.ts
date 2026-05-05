import os from "os";
import * as path from "path";

export const SPRINT_OS_DIRNAME = ".sprint-os";
export const SPRINT_OS_SERVICE_NAME = "sprint-os";
export const SPRINT_OS_DISPLAY_NAME = "Sprint OS";

export function getRelativeSprintOsPath(...segments: string[]): string {
  return path.join(SPRINT_OS_DIRNAME, ...segments);
}

export function getRepoSprintOsDir(repoPath: string): string {
  return path.join(repoPath, SPRINT_OS_DIRNAME);
}

export function getRepoSprintOsPath(repoPath: string, ...segments: string[]): string {
  return path.join(getRepoSprintOsDir(repoPath), ...segments);
}

export function getHomeSprintOsDir(): string {
  return path.join(os.homedir(), SPRINT_OS_DIRNAME);
}

export function getHomeSprintOsPath(...segments: string[]): string {
  return path.join(getHomeSprintOsDir(), ...segments);
}

export function getSprintSubtasksDir(repoPath: string, sprintNumber: number): string {
  return getRepoSprintOsPath(repoPath, "sprints", `sprint${sprintNumber}-subtasks`);
}

export function getRepoDebugLogPath(repoPath: string): string {
  return getRepoSprintOsPath(repoPath, "debug.log");
}
