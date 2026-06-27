import { describe, it, expect, vi, beforeEach } from "vitest";
import { SprintCyclePolicyService } from "../../../../../src/domain/sprint/orchestrator/sprint-cycle-policy-service.js";
import type { Subtask } from "../../../../../src/contracts/app-types.js";
import type { CycleRunnerArgs } from "../../../../../src/domain/sprint/orchestrator/cycle-runner.js";
import type { TaskQaMergeGateStatus } from "../../../../../src/services/quality-assurance-service.js";

describe("SprintCyclePolicyService", () => {
  const loggerMock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  const guardrailServiceMock = {
    evaluate: vi.fn(),
  };
  const projectManagementRepositoryMock = {
    updateTask: vi.fn(),
  };
  const executionRepositoryMock = {
    getLatestTaskRun: vi.fn(),
    updateTaskRun: vi.fn(),
  };
  const projectAttentionServiceMock = {
    openItems: vi.fn(),
  };

  const deps = {
    logger: loggerMock as any,
    guardrailService: guardrailServiceMock as any,
    projectManagementRepository: projectManagementRepositoryMock as any,
    executionRepository: executionRepositoryMock as any,
    projectAttentionService: projectAttentionServiceMock as any,
  };

  let service: SprintCyclePolicyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SprintCyclePolicyService(deps);
  });

  function createMockTask(overrides?: Partial<Subtask>): Subtask {
    return {
      id: "task-1",
      record_id: "rec-1",
      status: "TODO",
      ...overrides,
    } as any;
  }

  function createMockArgs(): CycleRunnerArgs {
    return {
      executionContext: {
        project: { id: "proj-1" },
        sprint: { id: "sprint-1" },
      },
      sprintRunId: "run-1",
    } as any;
  }

  function createMockQaGate(): TaskQaMergeGateStatus {
    return {
      reason: "retries_exhausted",
      runsUsed: 3,
      maxRuns: 3,
    } as any;
  }

  describe("applyQaExhaustionPolicy", () => {
    it("delegates to finishUnverifiedTask for FINISH_TASK policy", () => {
      const task = createMockTask();
      const args = createMockArgs();
      const qaGate = createMockQaGate();

      const result = service.applyQaExhaustionPolicy(task, qaGate, args, "FINISH_TASK");

      expect(result).toBe(true);
      expect(task.status).toBe("COMPLETED");
      expect(projectManagementRepositoryMock.updateTask).toHaveBeenCalledWith("rec-1", { status: "completed" });
    });

    it("does nothing if task already COMPLETED for FINISH_TASK", () => {
      const task = createMockTask({ status: "COMPLETED" });
      const result = service.applyQaExhaustionPolicy(task, createMockQaGate(), createMockArgs(), "FINISH_TASK");

      expect(result).toBe(false);
      expect(projectManagementRepositoryMock.updateTask).not.toHaveBeenCalled();
    });

    it("delegates to failUnverifiedTask for FAIL_TASK policy", () => {
      const task = createMockTask();
      const args = createMockArgs();
      const qaGate = createMockQaGate();
      executionRepositoryMock.getLatestTaskRun.mockReturnValue({ id: "tr-1" });

      const result = service.applyQaExhaustionPolicy(task, qaGate, args, "FAIL_TASK");

      expect(result).toBe(true);
      expect(task.status).toBe("FAILED");
      expect(executionRepositoryMock.updateTaskRun).toHaveBeenCalledWith("tr-1", expect.objectContaining({ state: "FAILED" }));
    });

    it("delegates to escalateUnverifiedTaskToHuman for ESCALATE_TO_HUMAN policy", () => {
      const task = createMockTask();
      const args = createMockArgs();
      const qaGate = createMockQaGate();

      const result = service.applyQaExhaustionPolicy(task, qaGate, args, "ESCALATE_TO_HUMAN");

      expect(result).toBe(true);
      expect(task.status).toBe("QA_REVIEW_FAILED");
      expect(projectManagementRepositoryMock.updateTask).toHaveBeenCalledWith("rec-1", {
        status: "QA_REVIEW_FAILED",
        mergeIndicator: null,
      });
      expect(projectAttentionServiceMock.openItems).toHaveBeenCalled();
    });
  });

  describe("applyTaskCodingGuardrail", () => {
    it("returns false if guardrail is allowed", () => {
      guardrailServiceMock.evaluate.mockReturnValue({ allowed: true });
      const task = createMockTask();
      const result = service.applyTaskCodingGuardrail(task, createMockArgs());

      expect(result).toBe(false);
      expect(task.status).toBe("TODO");
    });

    it("blocks task if guardrail blocks", () => {
      guardrailServiceMock.evaluate.mockReturnValue({ allowed: false, action: "STOP_AND_WAIT", count: 5, cap: 5 });
      const task = createMockTask();
      const result = service.applyTaskCodingGuardrail(task, createMockArgs());

      expect(result).toBe(true);
      expect(task.status).toBe("BLOCKED");
      expect(task.intervention_owner).toBe("HUMAN");
      expect(loggerMock.info).toHaveBeenCalledWith("Task blocked: coding guardrail reached", expect.any(Object));
    });
  });
});
