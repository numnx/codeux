import type { TaskExecutorType, TaskPriority } from "../contracts/project-management-types.js";
import { extractJsonLikeBlock } from "./planning-json-extractor.js";

export interface PlannedTaskDraft {
  key: string;
  title: string;
  description: string;
  promptMarkdown: string;
  priority?: TaskPriority;
  executorType?: TaskExecutorType;
  dependsOn?: string[];
}

export interface PlannedSprintPayload {
  goal?: string;
  tasks: PlannedTaskDraft[];
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
  priority: TaskPriority;
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

export function normalizePriority(value: string | undefined): TaskPriority {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "critical" || normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized as TaskPriority;
  }
  return "medium";
}

export function normalizeExecutor(value: string | undefined): TaskExecutorType {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "auto" || normalized === "mcp_worker" || normalized === "docker_cli" || normalized === "jules") {
    return normalized as TaskExecutorType;
  }
  return "auto";
}

export function parseJsonReply<T>(bodyMarkdown: string): T {
  const rawJson = extractJsonLikeBlock(bodyMarkdown);
  try {
    return JSON.parse(rawJson) as T;
  } catch (error) {
    throw new Error("Planning agent reply was not valid JSON.");
  }
}

export function normalizePlannedSprintPayload(bodyMarkdown: string): PlannedSprintPayload {
  const payload = parseJsonReply<PlannedSprintPayload & { subtasks?: unknown[] }>(bodyMarkdown);
  const rawTasks = Array.isArray(payload.tasks)
    ? payload.tasks
    : Array.isArray(payload.subtasks)
      ? payload.subtasks
      : [];
  if (rawTasks.length === 0) {
    throw new Error("Planning agent reply did not include any tasks.");
  }

  const seenKeys = new Set<string>();
  const tasks = rawTasks.map((task, index) => {
    const draft = task as PlannedTaskDraft & {
      id?: string;
      name?: string;
      prompt?: string;
      instructions?: string;
      depends_on?: string[];
      dependencies?: string[];
    };
    const key = String(draft.key || draft.id || "").trim() || `T${String(index + 1).padStart(2, "0")}`;
    if (seenKeys.has(key)) {
      throw new Error(`Planning agent returned duplicate task key: ${key}.`);
    }
    seenKeys.add(key);

    const title = draft.title !== undefined ? String(draft.title).trim() : draft.name !== undefined ? String(draft.name).trim() : "";
    const description = draft.description !== undefined ? String(draft.description).trim() : "";

    // Legacy alias support: promptMarkdown -> prompt -> instructions
    const promptMarkdown = draft.promptMarkdown !== undefined
      ? String(draft.promptMarkdown).trim()
      : draft.prompt !== undefined
        ? String(draft.prompt).trim()
        : draft.instructions !== undefined
          ? String(draft.instructions).trim()
          : draft.description !== undefined
            ? String(draft.description).trim()
            : "";

    if (!title || !promptMarkdown) {
      throw new Error(`Planning agent returned an incomplete task for key ${key}.`);
    }
    return {
      key,
      title,
      description,
      promptMarkdown,
      priority: normalizePriority(draft.priority),
      executorType: normalizeExecutor(draft.executorType),
      dependsOn: Array.isArray(draft.dependsOn)
        ? draft.dependsOn.map((dependency) => String(dependency || "").trim()).filter(Boolean)
        : Array.isArray(draft.depends_on)
          ? draft.depends_on.map((dependency) => String(dependency || "").trim()).filter(Boolean)
          : Array.isArray(draft.dependencies)
            ? draft.dependencies.map((dependency) => String(dependency || "").trim()).filter(Boolean)
        : [],
    };
  });

  return {
    goal: typeof payload.goal === "string" ? payload.goal : undefined,
    tasks,
  };
}

export function normalizeFollowUpTask(value: unknown): NormalizedQaFollowUpTask | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as QaFollowUpTaskPayload;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const promptMarkdown = typeof payload.promptMarkdown === "string"
    ? payload.promptMarkdown.trim()
    : typeof payload.prompt === "string"
      ? payload.prompt.trim()
      : "";
  if (!title || !promptMarkdown) {
    return null;
  }

  const description = typeof payload.description === "string" && payload.description.trim().length > 0
    ? payload.description.trim()
    : null;
  const dependsOnTaskKeys = Array.isArray(payload.dependsOnTaskKeys)
    ? payload.dependsOnTaskKeys.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
  const priority = payload.priority === "critical" || payload.priority === "high" || payload.priority === "low"
    ? payload.priority
    : "medium";

  return {
    title,
    promptMarkdown,
    description,
    dependsOnTaskKeys,
    priority,
  };
}

export function normalizeQaReviewResult(bodyMarkdown: string): NormalizedQaReviewResult {
  const rawJson = extractJsonLikeBlock(bodyMarkdown);
  let parsed: unknown;
  try {
    parsed = rawJson ? JSON.parse(rawJson) : JSON.parse(bodyMarkdown);
  } catch (error) {
    throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Result must be a JSON object.");
  }

  const payload = parsed as Record<string, unknown>;

  if (payload.verdict !== "pass" && payload.verdict !== "changes_requested") {
    throw new Error("Missing or invalid 'verdict'. Must be 'pass' or 'changes_requested'.");
  }

  const verdict = payload.verdict;

  if (typeof payload.summary !== "string" || payload.summary.trim() === "") {
    throw new Error("Missing or invalid 'summary'. Must be a non-empty string.");
  }

  const summary = payload.summary.trim();

  const findings = Array.isArray(payload.findings)
    ? payload.findings.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
  const fixInstructions = typeof payload.fixInstructions === "string" && payload.fixInstructions.trim().length > 0
    ? payload.fixInstructions.trim()
    : null;
  const targetTaskKey = typeof payload.targetTaskKey === "string" && payload.targetTaskKey.trim().length > 0
    ? payload.targetTaskKey.trim()
    : null;
  const shouldHavePr = typeof payload.shouldHavePr === "boolean" ? payload.shouldHavePr : null;
  const followUpTasks = Array.isArray(payload.followUpTasks)
    ? payload.followUpTasks
      .map((entry) => normalizeFollowUpTask(entry))
      .filter((entry): entry is NormalizedQaFollowUpTask => entry !== null)
    : [];

  return {
    verdict,
    summary,
    findings,
    fixInstructions,
    targetTaskKey,
    shouldHavePr,
    followUpTasks,
    raw: payload,
  };
}
