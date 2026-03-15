import type { AutoMergeFeaturePrResult, Subtask } from "../../../../contracts/app-types.js";
import {
  buildAutoMergeSuccessText,
  buildAutoMergeFailedText,
  buildAutoMergeScheduledText,
} from "./ci-notification-builder.js";

export async function attemptAutoMerge(args: {
  task: Subtask;
  prNumber: number;
  repoPath: string;
  mode: "always" | "when_green";
  autoMergeFeaturePr: (args: { repoPath: string; prNumber: number }) => Promise<AutoMergeFeaturePrResult>;
  persistMergedTask: (task: Subtask) => Promise<void>;
}): Promise<{ reportText: string; state: "merged" | "scheduled" | "failed" }> {
  const mergeResult = await args.autoMergeFeaturePr({
    repoPath: args.repoPath,
    prNumber: args.prNumber,
  });

  const merged = mergeResult.ok
    && mergeResult.autoMergeScheduled !== true
    && mergeResult.merged !== false;
  const autoMergeScheduled = mergeResult.ok && !merged && mergeResult.autoMergeScheduled === true;

  if (merged) {
    args.task.is_merged = true;
    args.task.status = "COMPLETED";
    args.task.merge_indicator = "AUTOMERGE";
    try {
      await args.persistMergedTask(args.task);
    } catch {
      // Keep runtime status update even if persistence fails.
    }
    return {
      reportText: buildAutoMergeSuccessText(args.task.id, args.prNumber, args.mode === "always" ? "always" : undefined),
      state: "merged",
    };
  }

  if (autoMergeScheduled) {
    args.task.is_merged = false;
    args.task.status = "RUNNING";
    args.task.merge_indicator = "CI";
    return {
      reportText: buildAutoMergeScheduledText(
        args.task.id,
        args.prNumber,
        mergeResult.message || "GitHub accepted the merge command but the PR is still open.",
        args.mode === "always" ? "always" : undefined,
      ),
      state: "scheduled",
    };
  }

  return {
    reportText: buildAutoMergeFailedText(
      args.task.id,
      args.prNumber,
      mergeResult.message || "unknown error",
      args.mode === "always" ? "always" : undefined,
    ),
    state: "failed",
  };
}
