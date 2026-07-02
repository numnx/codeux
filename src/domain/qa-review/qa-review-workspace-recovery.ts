import { buildWorkerBranchPrefix, buildWorkerBranch } from "../../services/cli-workflow-utils.js";
import type { Subtask, ProviderId } from "../../contracts/app-types.js";
import type { TaskRunRecord } from "../../contracts/execution-types.js";

export interface RecoverWorkspaceBranchArgs {
  task: Subtask;
  taskRun: TaskRunRecord | null;
  featureBranch: string;
  provider: ProviderId;
  resolvedWorkspaceBranch: string | null;

  // Provided I/O results instead of doing I/O here
  prMetadataBranch: string | null;
  gitBranchesListing: string[]; // output of `git branch -a --list` split by newline, or empty array if failed/unavailable
}

export interface RecoverWorkspaceBranchResult {
  workerBranch: string;
  isRecovered: boolean;
  metadataUpdates: {
    taskWorkerBranch: string | null;
    taskRunWorkerBranch: string | null;
  };
}

export function recoverWorkspaceBranch(args: RecoverWorkspaceBranchArgs): RecoverWorkspaceBranchResult {
  let workerBranch = args.task.worker_branch?.trim()
    || args.taskRun?.workerBranch?.trim()
    || args.resolvedWorkspaceBranch
    || undefined;

  let isRecovered = Boolean(workerBranch);

  if (!workerBranch) {
    if (args.prMetadataBranch) {
      workerBranch = args.prMetadataBranch;
      isRecovered = true;
    }
  }

  if (!workerBranch) {
    if (args.featureBranch && args.task?.id && args.provider) {
      const prefix = buildWorkerBranchPrefix(args.featureBranch, args.task.id, args.provider);
      if (args.gitBranchesListing.length > 0) {
        const branches = args.gitBranchesListing
          .map((b: string) => b.replace(/^\*?\s*/, "").trim())
          .filter(Boolean);
        const localMatch = branches.find((b: string) => !b.startsWith("remotes/") && b.includes(prefix));
        if (localMatch) {
          workerBranch = localMatch;
          isRecovered = true;
        } else {
          const remoteMatch = branches.find((b: string) => b.startsWith("remotes/origin/") && b.includes(prefix));
          if (remoteMatch) {
            workerBranch = remoteMatch.replace("remotes/origin/", "");
            isRecovered = true;
          }
        }
      }
    }
  }

  if (!workerBranch) {
    if (args.featureBranch?.trim() && args.task?.id?.trim() && args.provider) {
      try {
        workerBranch = buildWorkerBranch(args.featureBranch, args.task.id, args.provider);
      } catch (err) {
        // We catch inside if buildWorkerBranch fails. It will throw at the bottom if workerBranch is undefined.
      }
    }
  }

  if (!workerBranch) {
    throw new Error("Worker branch resolution failed and no safe fallback available.");
  }

  const metadataUpdates = {
    taskWorkerBranch: (workerBranch && isRecovered && args.task.worker_branch !== workerBranch) ? workerBranch : null,
    taskRunWorkerBranch: (workerBranch && isRecovered && (!args.taskRun || args.taskRun.workerBranch !== workerBranch)) ? workerBranch : null,
  };

  return { workerBranch, isRecovered, metadataUpdates };
}
