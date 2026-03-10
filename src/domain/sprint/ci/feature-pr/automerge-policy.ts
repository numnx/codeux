import type { Subtask } from "../../../../contracts/app-types.js";
import { buildAutoMergeSuccessText, buildAutoMergeFailedText } from "./ci-notification-builder.js";

export async function attemptAutoMerge(args: {
  task: Subtask;
  prNumber: number;
  repoPath: string;
  mode: "always" | "when_green";
  autoMergeFeaturePr: (args: { repoPath: string; prNumber: number }) => Promise<{ ok: boolean; message?: string }>;
  persistMergedTask: (task: Subtask) => Promise<void>;
}): Promise<string> {
  const mergeResult = await args.autoMergeFeaturePr({
    repoPath: args.repoPath,
    prNumber: args.prNumber,
  });

  if (mergeResult.ok) {
    args.task.is_merged = true;
    args.task.merge_indicator = "AUTOMERGE";
    try {
      await args.persistMergedTask(args.task);
    } catch {
      // Keep runtime status update even if persistence fails.
    }
    return buildAutoMergeSuccessText(args.task.id, args.prNumber, args.mode === "always" ? "always" : undefined);
  }

  return buildAutoMergeFailedText(args.task.id, args.prNumber, mergeResult.message || "unknown error", args.mode === "always" ? "always" : undefined);
}
