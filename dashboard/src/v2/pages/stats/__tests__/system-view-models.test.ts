import { describe, expect, it } from "vitest";
import {
  computeLegacyFilteredInvocations,
  computeLegacySummaryMetrics,
  computeLegacyAvailablePurposes,
  computeLegacyAvailableProviders,
  computeLegacyExternalApiMetrics,
  computeLegacyErrorsByCategory,
  computeLegacySprintStateSummary,
  EMPTY_FILTERS,
} from "../system-view-models.js";
import type { ExecutionInvocationRecord } from "../../../types.js";

const createInvocation = (overrides: Partial<ExecutionInvocationRecord> = {}): ExecutionInvocationRecord => ({
  id: "inv-1",
  projectId: "project-1",
  sprintId: null,
  taskId: null,
  sprintRunId: null,
  dispatchId: null,
  taskRunId: null,
  attentionItemId: null,
  providerInvocationId: null,
  type: "analysis",
  status: "completed",
  provider: "gemini",
  model: "gemini-2.0-flash",
  systemPrompt: null,
  startedAt: "2026-06-01T10:00:00.000Z",
  finishedAt: "2026-06-01T10:05:00.000Z",
  errorMessage: null,
  lastErrorCategory: null,
  lastErrorMessage: null,
  lastRetryAfterIso: null,
  messageCount: 2,
  lastMessageAt: "2026-06-01T10:05:00.000Z",
  invocationSource: "internal",
  agentPresetId: null,
  taskTitle: "Analyze code",
  totalTokens: 50,
  inputTokens: 30,
  outputTokens: 20,
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:05:00.000Z",

  ...overrides,
});

describe("system-view-models", () => {
  describe("computeLegacyFilteredInvocations", () => {
    it("filters by status", () => {
      const records = [
        createInvocation({ id: "1", status: "completed" }),
        createInvocation({ id: "2", status: "failed" }),
      ];

      const filtered = computeLegacyFilteredInvocations(records, { ...EMPTY_FILTERS, status: ["failed"] }, "", { key: "startedAt", dir: "desc" });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe("2");
    });

    it("filters by purpose and provider", () => {
      const records = [
        createInvocation({ id: "1", type: "analysis", provider: "gemini" }),
        createInvocation({ id: "2", type: "deployment", provider: "codex" }),
      ];

      const filtered = computeLegacyFilteredInvocations(records, { ...EMPTY_FILTERS, purpose: ["analysis"], provider: ["gemini"] }, "", { key: "startedAt", dir: "desc" });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe("1");
    });

    it("sorts by totalTokens ascending", () => {
      const records = [
        createInvocation({ id: "1", totalTokens: 100 }),
        createInvocation({ id: "2", totalTokens: 50 }),
      ];

      const filtered = computeLegacyFilteredInvocations(records, EMPTY_FILTERS, "", { key: "totalTokens", dir: "asc" });
      expect(filtered[0].id).toBe("2");
      expect(filtered[1].id).toBe("1");
    });
  });

  describe("computeLegacySummaryMetrics", () => {
    it("handles empty input", () => {
      const metrics = computeLegacySummaryMetrics([]);
      expect(metrics.totalInvocations).toBe(0);
      expect(metrics.avgDurationMs).toBe(0);
      expect(metrics.successRate).toBeNull();
    });

    it("calculates totals and rates", () => {
      const records = [
        createInvocation({ status: "completed", inputTokens: 10, outputTokens: 20 }),
        createInvocation({ status: "failed", inputTokens: 5, outputTokens: 5 }),
      ];
      const metrics = computeLegacySummaryMetrics(records);
      expect(metrics.totalInvocations).toBe(2);
      expect(metrics.completedCount).toBe(1);
      expect(metrics.failedCount).toBe(1);
      expect(metrics.errorRate).toBe(0.5);
      expect(metrics.successRate).toBe(0.5);
      expect(metrics.totalInputTokens).toBe(15);
      expect(metrics.totalOutputTokens).toBe(25);
    });
  });

  describe("computeLegacyAvailablePurposes", () => {
    it("extracts unique purposes including legacy purpose field", () => {
      const records = [
        createInvocation({ type: "coding" }),
        createInvocation({ type: "coding" }),
        { ...createInvocation({ type: "" }), purpose: "legacy_purpose" },
      ];
      const purposes = computeLegacyAvailablePurposes(records);
      expect(purposes).toEqual(["coding", "legacy_purpose"]);
    });
  });

  describe("computeLegacyAvailableProviders", () => {
    it("extracts unique providers", () => {
      const records = [
        createInvocation({ provider: "gemini" }),
        createInvocation({ provider: "codex" }),
        createInvocation({ provider: "gemini" }),
      ];
      const providers = computeLegacyAvailableProviders(records);
      expect(providers).toEqual(["codex", "gemini"]); // sorted
    });
  });

  describe("computeLegacyExternalApiMetrics", () => {
    it("categorizes external API calls based on type or purpose or provider", () => {
      const records = [
        createInvocation({ type: "git_push", finishedAt: "2026-06-01T10:05:00.000Z" }),
        createInvocation({ provider: "jules" }),
        createInvocation({ type: "jira_sync" }),
        createInvocation({ type: "other_api" }),
        createInvocation({ type: "coding" }), // isModel = true
      ];
      const metrics = computeLegacyExternalApiMetrics(records);
      expect(metrics.git.calls).toBe(1);
      expect(metrics.jules.calls).toBe(1);
      expect(metrics.jira.calls).toBe(1);
      expect(metrics.other.calls).toBe(1);
    });
  });

  describe("computeLegacyErrorsByCategory", () => {
    it("categorizes errors", () => {
      const records = [
        createInvocation({ status: "failed", lastErrorMessage: "timeout occurred" }),
        createInvocation({ status: "failed", lastErrorMessage: "rate limit 429" }),
        createInvocation({ status: "failed", lastErrorMessage: "model failed" }),
        createInvocation({ status: "failed", lastErrorMessage: "api http error" }),
        createInvocation({ status: "cancelled", lastErrorMessage: "" }),
        createInvocation({ status: "failed", lastErrorMessage: "unknown" }),
      ];

      const errors = computeLegacyErrorsByCategory(records);
      expect(errors.timeout).toBe(1);
      expect(errors.rateLimit).toBe(1);
      expect(errors.modelError).toBe(1);
      expect(errors.apiError).toBe(1);
      expect(errors.cancelled).toBe(1);
      expect(errors.other).toBe(1);
    });
  });

  describe("computeLegacySprintStateSummary", () => {
    it("summarizes sprints correctly with legacy projectRunId fallback", () => {
      const records = [
        createInvocation({ sprintId: "sprint-1", status: "completed" }),
        createInvocation({ sprintId: "sprint-2", status: "running" }),
        createInvocation({ sprintId: "sprint-2", status: "failed" }),
        { ...createInvocation({ sprintId: null, status: "paused" }), projectRunId: "sprint-3" },
      ];

      const summary = computeLegacySprintStateSummary(records);
      expect(summary.totalSprints).toBe(3);
      expect(summary.completedSprints).toBe(1);
      expect(summary.activeSprints).toBe(1);
      expect(summary.failedSprints).toBe(1);
      expect(summary.blockedTasks).toBe(1);
    });
  });
});
