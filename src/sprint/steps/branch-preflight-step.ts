import { commandRunner } from "../../shared/subprocess/command-runner.js";
import * as fs from "fs/promises";

export interface BranchAvailability {
  existsLocal: boolean;
  existsRemote: boolean;
}

export interface BranchPreparationResult extends BranchAvailability {
  hasRemoteOrigin: boolean;
  createdLocal: boolean;
  checkedOutLocal: boolean;
  pushedRemote: boolean;
}

const isGitRepository = async (repoPath: string): Promise<boolean> => {
  try {
    const result = await commandRunner.run("git", ["rev-parse", "--is-inside-work-tree"], { cwd: repoPath });
    return result.ok;
  } catch {
    return false;
  }
};

const hasLocalBranch = async (repoPath: string, branch: string): Promise<boolean> => {
  try {
    const result = await commandRunner.run("git", ["show-ref", "--verify", `refs/heads/${branch}`], { cwd: repoPath });
    return result.ok;
  } catch {
    return false;
  }
};

const hasRemoteBranch = async (repoPath: string, branch: string): Promise<boolean> => {
  try {
    const result = await commandRunner.run("git", ["ls-remote", "--heads", "origin", branch], { cwd: repoPath });
    return result.ok && result.stdout.trim().length > 0;
  } catch {
    return false;
  }
};

const hasRemoteOrigin = async (repoPath: string): Promise<boolean> => {
  try {
    const result = await commandRunner.run("git", ["remote", "get-url", "origin"], { cwd: repoPath });
    return result.ok && result.stdout.trim().length > 0;
  } catch {
    return false;
  }
};

const createLocalBranch = async (repoPath: string, branch: string, defaultBranch: string): Promise<boolean> => {
  try {
    const hasLocalDefaultBranch = await commandRunner.run("git", ["show-ref", "--verify", `refs/heads/${defaultBranch}`], { cwd: repoPath });
    if (hasLocalDefaultBranch.ok) {
      const result = await commandRunner.run("git", ["branch", branch, defaultBranch], { cwd: repoPath });
      return result.ok;
    }

    const hasRemoteDefaultBranch = await commandRunner.run("git", ["show-ref", "--verify", `refs/remotes/origin/${defaultBranch}`], { cwd: repoPath });
    const result = hasRemoteDefaultBranch.ok
      ? await commandRunner.run("git", ["branch", branch, `origin/${defaultBranch}`], { cwd: repoPath })
      : await commandRunner.run("git", ["branch", branch], { cwd: repoPath });
    return result.ok;
  } catch {
    return false;
  }
};

const pushRemoteBranch = async (repoPath: string, branch: string): Promise<boolean> => {
  try {
    const result = await commandRunner.run("git", ["push", "-u", "origin", `refs/heads/${branch}:refs/heads/${branch}`], { cwd: repoPath });
    return result.ok;
  } catch {
    return false;
  }
};

export const runBranchPreflightStep = async (repoPath: string, branch: string): Promise<BranchAvailability> => {
  try {
    const stats = await fs.stat(repoPath);
    if (!stats.isDirectory()) {
      return { existsLocal: false, existsRemote: false };
    }
  } catch {
    return { existsLocal: false, existsRemote: false };
  }

  if (!(await isGitRepository(repoPath))) {
    return { existsLocal: false, existsRemote: false };
  }

  return {
    existsLocal: await hasLocalBranch(repoPath, branch),
    existsRemote: await hasRemoteBranch(repoPath, branch),
  };
};

export const prepareBranchForOrchestration = async (
  repoPath: string,
  branch: string,
  defaultBranch: string,
): Promise<BranchPreparationResult> => {
  const initial = await runBranchPreflightStep(repoPath, branch);
  const remoteOrigin = await hasRemoteOrigin(repoPath);

  let createdLocal = false;
  let checkedOutLocal = false;
  let pushedRemote = false;

  if (initial.existsLocal) {
    checkedOutLocal = true;
  } else {
    createdLocal = await createLocalBranch(repoPath, branch, defaultBranch);
    checkedOutLocal = createdLocal;
  }

  let existsLocal = initial.existsLocal || createdLocal;
  let existsRemote = initial.existsRemote;

  if (existsLocal && remoteOrigin && !existsRemote) {
    pushedRemote = await pushRemoteBranch(repoPath, branch);
    existsRemote = pushedRemote || await hasRemoteBranch(repoPath, branch);
  }

  return {
    existsLocal,
    existsRemote,
    hasRemoteOrigin: remoteOrigin,
    createdLocal,
    checkedOutLocal,
    pushedRemote,
  };
};
