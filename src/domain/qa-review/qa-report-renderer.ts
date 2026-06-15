import type { Subtask } from "../../contracts/app-types.js";
import type { QaReviewRunRecord } from "../../repositories/qa-review-repository.js";

export function renderQaPassReport(taskKey: string, summary: string): string {
  return `\nQA passed for \`${taskKey}\`: ${summary}\n`;
}

export function renderQaChangesRequestedReport(taskKey: string, summary: string, continued: boolean): string {
  return `\nQA requested follow-up for \`${taskKey}\`${continued ? " and resumed the task session" : ""}: ${summary}\n`;
}

export function renderQaReviewFailedReport(taskKey: string, error: unknown): string {
  const summary = error instanceof Error ? error.message : String(error);
  return `\nQA review failed for \`${taskKey}\` and must retry before merge: ${summary}\n`;
}

export function renderSprintQaPassReport(summary: string): string {
  return `\nSprint QA passed: ${summary}\n`;
}

export function renderSprintQaChangesRequestedReport(
  summary: string,
  targetTaskKey: string | null,
  continued: boolean,
  createdTaskKeys: string[],
): string {
  const target = targetTaskKey ? ` Target task: \`${targetTaskKey}\`.` : "";
  const created = createdTaskKeys.length > 0
    ? ` Created follow-up tasks: ${createdTaskKeys.map((taskKey) => `\`${taskKey}\``).join(", ")}.`
    : "";
  return `\nSprint QA requested follow-up${continued ? " and resumed the selected task session." : "."}${target}${created} ${summary}\n`;
}

export function renderSprintQaPendingReport(run: QaReviewRunRecord): string {
  const summary = run.summaryMarkdown?.trim();
  if (run.status === "running") {
    return "\nSprint QA is still running. Main merge remains blocked until the review finishes.\n";
  }
  if (run.outcome === "changes_requested") {
    return `\nSprint QA is still waiting on follow-up work before merge.${summary ? ` ${summary}` : ""}\n`;
  }
  return `\nSprint QA must be retried before merge.${summary ? ` ${summary}` : ""}\n`;
}

export function renderSprintQaFailedReport(error: unknown): string {
  const summary = error instanceof Error ? error.message : String(error);
  return `\nSprint QA failed and blocked merge: ${summary}\n`;
}

export function buildSprintQaSnapshot(subtasks: Subtask[]): string {
  return JSON.stringify(
    subtasks
      .map((task) => ({
        id: task.id,
        title: task.title || "",
        prompt: task.prompt || "",
        status: task.status || "",
        dependsOn: [...task.depends_on].sort(),
        isMerged: Boolean(task.is_merged),
        mergeIndicator: task.merge_indicator || "",
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  );
}

export function readSprintQaSnapshot(run: QaReviewRunRecord | null): string | null {
  const snapshot = run?.payload?.taskSnapshot;
  return typeof snapshot === "string" && snapshot.trim().length > 0 ? snapshot : null;
}
