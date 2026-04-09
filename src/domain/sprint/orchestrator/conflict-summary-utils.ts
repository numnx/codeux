export interface MergeConflictTaskContext {
  taskKey: string;
  taskTitle: string;
  taskPrompt: string;
  workerBranch: string | null;
  prUrl: string | null;
}

export interface BuildConflictSummaryParams {
  repoPath: string;
  workingDir: string;
  conflictingBranches: {
    source: string;
    target: string;
  };
  prInfo?: {
    number?: number | null;
    url?: string | null;
  };
  taskContext?: {
    id: string;
    title: string;
    prompt: string;
  };
  mergedTaskContexts: MergeConflictTaskContext[];
  isMainMerge?: boolean;
}

export function selectMergedTaskContexts(
  subtasks: Array<{
    record_id?: string | null;
    id: string;
    title: string;
    prompt: string;
    worker_branch?: string | null;
    pr_url?: string | null;
    is_merged?: boolean;
  }>,
  options?: {
    excludedTaskId?: string;
    limit?: number;
  }
): MergeConflictTaskContext[] {
  let filtered = subtasks.filter((task) => {
    if (!task.is_merged) return false;
    if (options?.excludedTaskId && task.record_id?.trim() === options.excludedTaskId) return false;
    return true;
  });

  if (options?.limit !== undefined) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered.map((task) => ({
    taskKey: task.id,
    taskTitle: task.title,
    taskPrompt: task.prompt,
    workerBranch: task.worker_branch || null,
    prUrl: task.pr_url || null,
  }));
}

export function buildConflictSummaryMarkdown(params: BuildConflictSummaryParams): string {
  const { repoPath, workingDir, conflictingBranches, prInfo, taskContext, mergedTaskContexts, isMainMerge } = params;

  const lines: string[] = [];

  if (isMainMerge) {
    lines.push(
      `Main-branch merge conflict detected for \`${conflictingBranches.source} -> ${conflictingBranches.target}\`.`,
      `Repo path: \`${repoPath}\``,
      `Working directory: \`${workingDir}\``
    );
  } else {
    if (taskContext) {
      lines.push(`Task \`${taskContext.id}\` completed, but the feature PR is reporting merge conflicts between \`${conflictingBranches.source}\` and \`${conflictingBranches.target}\`.`);
    } else {
      lines.push(`The feature PR is reporting merge conflicts between \`${conflictingBranches.source}\` and \`${conflictingBranches.target}\`.`);
    }
    lines.push(
      "",
      "Resolve this through the virtual worker flow so the sprint can continue without a manual dashboard merge handoff.",
      "",
      `Repo path: \`${repoPath}\``,
      `Working directory: \`${workingDir}\``,
      `Conflicting branches: \`${conflictingBranches.source}\` -> \`${conflictingBranches.target}\``
    );
  }

  if (prInfo) {
    if (isMainMerge) {
      if (prInfo.number) {
        lines.push(`PR: #${prInfo.number}${prInfo.url ? ` (${prInfo.url})` : ""}`);
      } else if (prInfo.url) {
        lines.push(`PR: ${prInfo.url}`);
      }
    } else {
      if (prInfo.url) {
        lines.push(`Feature PR: ${prInfo.url}`);
      }
    }
  }

  if (!isMainMerge && taskContext) {
    lines.push(
      "",
      `Current task: \`${taskContext.id}\` ${taskContext.title}`,
      "",
      "Current task prompt:",
      "```md",
      taskContext.prompt.trim() || "No prompt recorded.",
      "```"
    );
  }

  if (mergedTaskContexts.length > 0) {
    lines.push("", "Merged task prompts already on the feature branch:");
    for (const task of mergedTaskContexts) {
      if (isMainMerge) {
        lines.push(`- \`${task.taskKey}\` ${task.taskTitle}: ${task.taskPrompt}`);
      } else {
        lines.push(
          "",
          `### ${task.taskKey} ${task.taskTitle}`,
          task.workerBranch ? `Branch: \`${task.workerBranch}\`` : "Branch: not recorded",
          task.prUrl ? `PR: ${task.prUrl}` : "PR: not recorded",
          "```md",
          task.taskPrompt.trim() || "No prompt recorded.",
          "```"
        );
      }
    }
  }

  return lines.join("\n");
}
