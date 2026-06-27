import type { Subtask } from "../../../contracts/app-types.js";
import type { TaskQaMergeGateStatus } from "../../../services/quality-assurance-service.js";
import type { CycleRunnerArgs } from "./cycle-runner.js";
import type { QaExhaustionPolicy } from "../../../contracts/app-types.js";
import type { ProjectAttentionOwnerType } from "../../../contracts/project-attention-types.js";
import { resolveCiEscalationOwner } from "../ci/feature-pr/ci-autofix-policy.js";

// Import types used in dependencies
import type { SprintOrchestratorDependencies } from "../../../sprint/sprint-orchestrator.js";

export interface SprintCyclePolicyDependencies {
  logger: SprintOrchestratorDependencies["logger"];
  guardrailService: SprintOrchestratorDependencies["guardrailService"];
  projectManagementRepository: SprintOrchestratorDependencies["projectManagementRepository"];
  executionRepository: SprintOrchestratorDependencies["executionRepository"];
  projectAttentionService?: SprintOrchestratorDependencies["projectAttentionService"];
}

export class SprintCyclePolicyService {
  constructor(private readonly deps: SprintCyclePolicyDependencies) {}

  /**
   * Evaluates the per-task coding guardrail before a task is (re)dispatched. Returns true
   * when the task is blocked and should be skipped this cycle. The invocation itself is
   * recorded by SprintTaskDispatchService after a successful dispatch (record-once).
   */
  public applyTaskCodingGuardrail(task: Subtask, args: CycleRunnerArgs): boolean {
    const taskId = task.record_id;
    if (!taskId) {
      return false;
    }
    const scope = {
      projectId: args.executionContext.project.id,
      sprintId: args.executionContext.sprint.id,
    };
    const evaluation = this.deps.guardrailService.evaluate(scope, taskId, "task_coding");
    if (evaluation.allowed) {
      return false;
    }
    if (evaluation.action === "WARN_ONLY") {
      this.deps.logger.warn("Task coding guardrail reached (warn only)", {
        taskId: task.id,
        count: evaluation.count,
        cap: evaluation.cap,
      });
      return false;
    }
    const owner = evaluation.action === "STOP_AND_WAIT" ? "HUMAN" : resolveCiEscalationOwner(args.automationLevel);
    task.status = "BLOCKED";
    task.intervention_owner = owner;
    task.intervention_hint = evaluation.blockedByTotalCeiling
      ? `Per-task invocation ceiling reached for task ${task.id} (${evaluation.reason ?? ""}).`
      : `Coding guardrail reached for task ${task.id}: ${evaluation.count}/${evaluation.cap} coding attempts.`;
    this.deps.logger.info("Task blocked: coding guardrail reached", {
      taskId: task.id,
      count: evaluation.count,
      cap: evaluation.cap,
      owner,
    });
    return true;
  }

  /**
   * Apply the configured QA exhaustion policy to a code-complete task whose QA
   * review budget is spent without a pass. Returns true when the policy moved the
   * task to a resting state (so the caller should skip further QA scheduling).
   * Idempotent — once the task already rests in the policy's target state this is
   * a no-op and returns false so normal processing continues.
   */
  public applyQaExhaustionPolicy(
    task: Subtask,
    qaGate: TaskQaMergeGateStatus,
    args: CycleRunnerArgs,
    policy: QaExhaustionPolicy,
  ): boolean {
    switch (policy) {
      case "FINISH_TASK":
        if (task.status === "COMPLETED") {
          return false;
        }
        this.finishUnverifiedTask(task, qaGate, args);
        return true;
      case "FAIL_TASK":
        if (task.status === "FAILED") {
          return false;
        }
        this.failUnverifiedTask(task, qaGate, args);
        return true;
      case "ESCALATE_TO_HUMAN":
      default:
        if (task.status === "QA_REVIEW_FAILED") {
          return false;
        }
        this.escalateUnverifiedTaskToHuman(task, qaGate, args);
        return true;
    }
  }

  /**
   * FINISH_TASK policy: mark the task COMPLETED despite no QA pass (fail open).
   * Clears intervention metadata so the merge gate can settle it normally.
   */
  public finishUnverifiedTask(
    task: Subtask,
    qaGate: TaskQaMergeGateStatus,
    args: CycleRunnerArgs,
  ): void {
    const taskId = task.record_id?.trim();
    task.status = "COMPLETED";
    task.intervention_owner = undefined;
    task.intervention_hint = undefined;
    if (taskId) {
      this.deps.projectManagementRepository.updateTask(taskId, { status: "completed" });
    }
    this.deps.logger.warn("QA exhausted without clearing task — finished anyway (FINISH_TASK policy)", {
      projectId: args.executionContext.project.id,
      sprintId: args.executionContext.sprint.id,
      sprintRunId: args.sprintRunId,
      taskId,
      taskKey: task.id,
      qaReason: qaGate.reason,
      runsUsed: qaGate.runsUsed,
      maxRuns: qaGate.maxRuns,
    });
  }

  /**
   * FAIL_TASK policy: mark the task FAILED and let the sprint move on. No human
   * gate — the work is discarded rather than held.
   */
  public failUnverifiedTask(
    task: Subtask,
    qaGate: TaskQaMergeGateStatus,
    args: CycleRunnerArgs,
  ): void {
    const taskId = task.record_id?.trim();
    const hint = "QA could not verify this task and the review budget is exhausted. Marked FAILED per the QA exhaustion policy.";
    task.status = "FAILED";
    task.merge_indicator = undefined;
    task.intervention_owner = undefined;
    task.intervention_hint = hint;
    // Runtime FAILED is carried by the task-run state (there is no planning
    // "failed" status). Persisting the run state makes the sprint count this task
    // as terminal (see sprint-state-evaluator) so the sprint can finish, and the
    // state survives a reload.
    if (taskId) {
      const taskRun = this.deps.executionRepository.getLatestTaskRun(taskId, args.sprintRunId);
      if (taskRun) {
        this.deps.executionRepository.updateTaskRun(taskRun.id, {
          state: "FAILED",
          finishedAt: taskRun.finishedAt ?? new Date().toISOString(),
        });
      }
    }
    this.deps.logger.warn("QA exhausted without clearing task — failed (FAIL_TASK policy)", {
      projectId: args.executionContext.project.id,
      sprintId: args.executionContext.sprint.id,
      sprintRunId: args.sprintRunId,
      taskId,
      taskKey: task.id,
      qaReason: qaGate.reason,
      runsUsed: qaGate.runsUsed,
      maxRuns: qaGate.maxRuns,
    });
  }

  /**
   * ESCALATE_TO_HUMAN policy: park the task in QA_REVIEW_FAILED and raise a
   * human-escalation attention item. This is the fail-closed end of the QA gate:
   * rather than letting an exhausted/unverified task settle as COMPLETED (which
   * silently shipped tasks with no PR), we hold it for a human. Idempotent — the
   * status flip and deduped attention item make repeat cycles no-ops.
   */
  public escalateUnverifiedTaskToHuman(
    task: Subtask,
    qaGate: TaskQaMergeGateStatus,
    args: CycleRunnerArgs,
  ): void {
    const taskId = task.record_id?.trim();
    const hint = "QA could not verify this task and the review budget is exhausted. Inspect the produced work and finish or close the task manually.";

    task.status = "QA_REVIEW_FAILED";
    task.merge_indicator = undefined;
    task.intervention_owner = "HUMAN";
    task.intervention_hint = hint;

    if (!taskId) {
      return;
    }

    this.deps.projectManagementRepository.updateTask(taskId, {
      status: "QA_REVIEW_FAILED",
      mergeIndicator: null,
    });

    this.deps.projectAttentionService?.openItems?.([
      {
        projectId: args.executionContext.project.id,
        sprintId: args.executionContext.sprint.id,
        taskId,
        sprintRunId: args.sprintRunId,
        attentionType: "human_escalation_required",
        severity: "high",
        ownerType: "human" as ProjectAttentionOwnerType,
        title: `QA could not verify ${task.id}`,
        summaryMarkdown: [
          `Task \`${task.id}\` (${task.title ?? "untitled"}) finished coding but QA never cleared it.`,
          qaGate.summary ? `\nLatest QA signal: ${qaGate.summary}` : "",
          `\nReviews used: ${qaGate.runsUsed}/${qaGate.maxRuns}. The task is held in QA_REVIEW_FAILED and will not be merged or marked complete until a human resolves it.`,
        ].filter(Boolean).join("\n"),
        payload: {
          taskKey: task.id,
          qaReason: qaGate.reason,
          runsUsed: qaGate.runsUsed,
          maxRuns: qaGate.maxRuns,
        },
      },
    ]);

    this.deps.logger.warn("QA exhausted without clearing task — escalated to human", {
      projectId: args.executionContext.project.id,
      sprintId: args.executionContext.sprint.id,
      sprintRunId: args.sprintRunId,
      taskId,
      taskKey: task.id,
      qaReason: qaGate.reason,
      runsUsed: qaGate.runsUsed,
      maxRuns: qaGate.maxRuns,
    });
  }
}
