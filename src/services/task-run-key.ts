import * as path from "path";

const sanitizeSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

export const buildTaskRunKey = (repoPath: string, sprintNumber: number, taskName: string): string => {
  const repoSegment = sanitizeSegment(path.basename(path.resolve(repoPath))) || "repo";
  const sprintSegment = Number.isFinite(sprintNumber) ? String(sprintNumber) : "0";
  const taskSegment = sanitizeSegment(taskName) || "task";
  return `${repoSegment}/s${sprintSegment}/${taskSegment}`;
};

export const buildTaskRunTag = (repoPath: string, sprintNumber: number, taskName: string): string => {
  return `[run:${buildTaskRunKey(repoPath, sprintNumber, taskName)}]`;
};

export const extractTaskRunKeyFromTitle = (title: string | undefined): string | null => {
  if (!title) {
    return null;
  }
  const match = title.match(/\[run:([^\]]+)\]/);
  return match ? match[1] : null;
};
