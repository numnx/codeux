import { runCommandStrict, type CommandResult } from "./cli-process-runner.js";

export type GitBranchSyncRunner = (
  command: string,
  args: string[],
  cwd: string,
) => Promise<CommandResult>;

export async function fetchOriginIfAvailable(
  repoPath: string,
  runner: GitBranchSyncRunner = runCommandStrict,
): Promise<boolean> {
  try {
    await runner("git", ["remote", "get-url", "origin"], repoPath);
  } catch {
    return false;
  }

  await runner("git", ["fetch", "origin", "--prune"], repoPath);
  return true;
}
