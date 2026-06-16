import type { Subtask } from "../../contracts/app-types.js";
import type { QaReviewTriggerType } from "../../repositories/qa-review-repository.js";

export function triggerReviewModeDescription(triggerType: QaReviewTriggerType): string {
  switch (triggerType) {
    case "completed_task_without_pr":
      return "Review a completed task with no PR and decide whether a PR should exist.";
    case "sprint_completion":
      return "Review the full sprint for integration quality before final completion.";
    case "task_completion":
    default:
      return "Review a completed task for correctness, completeness, and integration quality.";
  }
}

export function buildReviewScopeInstructions(triggerType: QaReviewTriggerType, currentTask: Subtask | null): string {
  if (triggerType === "sprint_completion") {
    return [
      "- This is a full sprint review. Evaluate the combined sprint outcome against the sprint goal and all task instructions.",
      "- You may request fixes for cross-task integration issues, missing sprint deliverables, or regressions that affect the completed sprint.",
      "- Use `targetTaskKey` or `followUpTasks` to route required work according to the output rules.",
    ].join("\n");
  }

  const currentTaskKey = currentTask?.id || "the current task";
  const dependencyList = currentTask?.depends_on?.length ? currentTask.depends_on.join(", ") : "none";

  return [
    `- This is a single-task QA review. The only task under review is ${currentTaskKey}.`,
    "- Treat `SPRINT TASKS` and non-current entries in `FULL TASK INSTRUCTIONS` as context only, not as deliverables for this review.",
    "- Assume the current workspace/branch contains only the current task's changes on top of its base branch. Independent sibling tasks may be completed in separate branches or PRs and may be absent here.",
    "- A task-level review must pass when the current task satisfies its own prompt, even if other completed sprint tasks are not present in this branch.",
    "- Do not request changes because files, commits, PRs, or behavior from other completed sibling tasks are missing from this branch.",
    "- Do not tell the coding session to implement, restore, or modify another task's scope.",
    "- Compare the implementation against the current task prompt, its declared scope, and regressions directly introduced by the current task.",
    `- Current task dependencies: ${dependencyList}. Use dependencies only to understand the current task contract; do not require unrelated sibling task deliverables.`,
    "- For task-level reviews, review only the current task and return `targetTaskKey` as the current task key when changes are required.",
  ].join("\n");
}

export function renderActivityExcerpt(task: Subtask): string {
  const activities = Array.isArray(task.activities) ? task.activities.slice(-8) : [];
  if (activities.length === 0) {
    return "- No recent activity captured.";
  }

  return activities.map((entry) => {
    const message = entry.agentMessaged?.agentMessage
      || entry.userMessaged?.userMessage
      || entry.progressUpdated?.description
      || entry.description
      || "No summary";
    return `- ${message}`;
  }).join("\n");
}

export function buildQaReviewPrompt(args: {
  triggerType: QaReviewTriggerType;
  projectName: string;
  sprintGoal: string;
  agentInstructions: string;
  memoryContext?: string;
  subtasks: Subtask[];
  currentTask: Subtask | null;
}): string {
  const isTaskLevelReview = args.triggerType === "task_completion" || args.triggerType === "completed_task_without_pr";
  const reviewScopeInstructions = buildReviewScopeInstructions(args.triggerType, args.currentTask);

  const currentTaskSection = args.currentTask
    ? [
      isTaskLevelReview ? "## CURRENT TASK UNDER REVIEW" : "## CURRENT TASK",
      `Task key: ${args.currentTask.id}`,
      `Title: ${args.currentTask.title}`,
      `Status: ${args.currentTask.status || "unknown"}`,
      `Provider: ${args.currentTask.provider || "unknown"}`,
      `Worker branch: ${args.currentTask.worker_branch || "none"}`,
      `PR URL: ${args.currentTask.pr_url || "none"}`,
      "",
      "Prompt:",
      args.currentTask.prompt,
      "",
      "Recent activity excerpts:",
      renderActivityExcerpt(args.currentTask),
    ]
    : [
      "## CURRENT TASK",
      "No single task is preselected. If fixes are required, choose the best target task from the sprint task list and return its task key in `targetTaskKey`.",
    ];
  const fullTaskInstructionsHeading = isTaskLevelReview
    ? "## FULL TASK INSTRUCTIONS (SPRINT CONTEXT; ONLY CURRENT TASK IS UNDER REVIEW)"
    : "## FULL TASK INSTRUCTIONS";
  const fullTaskContextSections = args.subtasks.map((task) => [
    `### ${task.id}: ${task.title}`,
    `Status: ${task.status || "unknown"}`,
    `Provider: ${task.provider || "unknown"}`,
    `Worker branch: ${task.worker_branch || "none"}`,
    `PR URL: ${task.pr_url || "none"}`,
    `Depends on: ${task.depends_on.length > 0 ? task.depends_on.join(", ") : "none"}`,
    "",
    "Instruction:",
    task.prompt || "No task instruction provided.",
    "",
    "Recent activity excerpts:",
    renderActivityExcerpt(task),
  ].join("\n"));

  return [
    "## QUALITY ASSURANCE AGENT INSTRUCTIONS",
    args.agentInstructions.trim(),
    args.memoryContext?.trim() || "",
    "",
    "## REVIEW MODE",
    `Trigger: ${args.triggerType}`,
    triggerReviewModeDescription(args.triggerType),
    "",
    "## REVIEW SCOPE",
    reviewScopeInstructions,
    "",
    "## PROJECT CONTEXT",
    `Project: ${args.projectName}`,
    `Sprint goal: ${args.sprintGoal || "No sprint goal provided."}`,
    "",
    "## SPRINT TASKS",
    args.subtasks.map((task) => (
      `- [${task.status || "unknown"}] ${task.id}: ${task.title} | provider=${task.provider || "unknown"} | branch=${task.worker_branch || "none"} | pr=${task.pr_url || "none"}`
    )).join("\n"),
    "",
    fullTaskInstructionsHeading,
    fullTaskContextSections.join("\n\n"),
    "",
    ...currentTaskSection,
    "",
    "## REQUIRED OUTPUT",
    "Return JSON only.",
    "Use this exact shape:",
    "{",
    '  "verdict": "pass" | "changes_requested",',
    '  "summary": "short markdown summary",',
    '  "findings": ["finding 1", "finding 2"],',
    '  "fixInstructions": "direct instructions for the coding session" | null,',
    '  "targetTaskKey": "T01" | null,',
    '  "shouldHavePr": true | false | null,',
    '  "followUpTasks": [',
    "    {",
    '      "title": "follow-up task title",',
    '      "promptMarkdown": "full task instructions",',
    '      "description": "optional short description" | null,',
    '      "dependsOnTaskKeys": ["T01"],',
    '      "priority": "high" | "medium" | "low"',
    "    }",
    "  ]",
    "}",
    "",
    "Rules:",
    "- `summary` must be concise and factual.",
    "- If `verdict` is `changes_requested`, `fixInstructions` must tell the coding session exactly what to fix next.",
    "- For sprint completion reviews, set `targetTaskKey` to the best task to continue when changes are required.",
    "- For sprint completion reviews, use `followUpTasks` when the required work should become new sprint tasks instead of only resuming one existing session.",
    "- Every `followUpTasks[].promptMarkdown` entry must contain the full task instructions, not just a short summary.",
    "- For `completed_task_without_pr`, set `shouldHavePr` explicitly.",
    "- Do not include prose outside the JSON object.",
  ].join("\n");
}

export function buildFollowUpSessionPrompt(args: {
  workerInstructions: string;
  workerMemoryContext?: string;
  originalPrompt: string;
  followUpPrompt: string;
  workerMemoryInstructions?: string;
}): string {
  return [
    args.workerInstructions
      ? `## SYSTEM INSTRUCTIONS & ENGINEERING STANDARDS\n\n${args.workerInstructions}`
      : "",
    args.workerMemoryContext?.trim() || "",
    "## ORIGINAL SUBTASK",
    args.originalPrompt,
    "",
    "## QA FOLLOW-UP",
    args.followUpPrompt,
    args.workerMemoryInstructions
      ? `## LEARNINGS CAPTURE (Required)\n\n${args.workerMemoryInstructions}`
      : "",
  ].filter(Boolean).join("\n\n");
}

export function buildFollowUpTaskPrompt(args: {
  sprintGoal: string;
  taskId: string;
  taskTitle: string;
  promptMarkdown: string;
}): string {
  return [
    "This is a follow-up task identified during a quality assurance review.",
    args.sprintGoal ? `Sprint Goal: ${args.sprintGoal}` : "",
    `Context task: ${args.taskId} (${args.taskTitle})`,
    "",
    "## REVIEW INSTRUCTIONS",
    args.promptMarkdown,
  ].filter(Boolean).join("\n");
}
