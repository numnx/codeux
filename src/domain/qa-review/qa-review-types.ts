export interface QaReviewResultPayload {
  verdict?: unknown;
  summary?: unknown;
  findings?: unknown;
  fixInstructions?: unknown;
  targetTaskKey?: unknown;
  shouldHavePr?: unknown;
  followUpTasks?: unknown;
}

export interface QaFollowUpTaskPayload {
  title?: unknown;
  promptMarkdown?: unknown;
  prompt?: unknown;
  description?: unknown;
  dependsOnTaskKeys?: unknown;
  priority?: unknown;
}

export interface NormalizedQaFollowUpTask {
  title: string;
  promptMarkdown: string;
  description: string | null;
  dependsOnTaskKeys: string[];
  priority: "critical" | "high" | "medium" | "low";
}

export interface NormalizedQaReviewResult {
  verdict: "pass" | "changes_requested";
  summary: string;
  findings: string[];
  fixInstructions: string | null;
  targetTaskKey: string | null;
  shouldHavePr: boolean | null;
  followUpTasks: NormalizedQaFollowUpTask[];
  raw: Record<string, unknown>;
}
