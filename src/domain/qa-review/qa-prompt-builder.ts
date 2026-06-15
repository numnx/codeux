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
  const currentTaskSection = args.currentTask
    ? [
      "## CURRENT TASK",
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
    "## PROJECT CONTEXT",
    `Project: ${args.projectName}`,
    `Sprint goal: ${args.sprintGoal || "No sprint goal provided."}`,
    "",
    "## SPRINT TASKS",
    args.subtasks.map((task) => (
      `- [${task.status || "unknown"}] ${task.id}: ${task.title} | provider=${task.provider || "unknown"} | branch=${task.worker_branch || "none"} | pr=${task.pr_url || "none"}`
    )).join("\n"),
    "",
    "## FULL TASK INSTRUCTIONS",
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
