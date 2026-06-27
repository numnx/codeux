cat << 'SERVICE' > src/domain/sprint/orchestrator/sprint-finalization-service.ts
import { DashboardStatusSnapshot, CiIntelligenceSettings, DashboardSettings, Subtask } from "../../../contracts/app-types.js";
import { MergeFeedbackResult } from "../ci/main-merge-gate.js";
import { SprintExecutionContext } from "../../../services/sprint-execution-state-service.js";
import { WatchLoopDependencies } from "./watch-loop-runner.js";
import { buildTaskAttentionPayload } from "./attention-payload-builder.js";
import { InstructionTemplateId } from "../../../instructions/instruction-template-catalog.js";
import { isCompletedTaskSettled } from "../task-merge-state.js";
import { decideMainMergeWaitOrPause, decideTerminalCompletion, isHumanEscalatedAttentionItem } from "./watch-loop-policies.js";
import { decideFinalizationTransition } from "./watch-loop-finalization-policy.js";
import { runCompletionStep } from "../../../sprint/steps/completion-step.js";
import { getCheckedOutRef, mergeBranchLocally, restoreCheckedOutRef } from "../../../infrastructure/git/local-merge.js";
import { transitionSprintRun } from "./sprint-run-transitions.js";
import { buildConflictSummaryMarkdown, selectMergedTaskContexts } from "./conflict-summary-utils.js";
import { isMainMergeAttentionItem } from "./sprint-state-evaluator.js";

export type SprintFinalizationDependencies = Pick<
  WatchLoopDependencies,
  | "projectAttentionService"
  | "executionRepository"
  | "renderInstruction"
  | "qualityAssuranceService"
  | "logger"
  | "completedSprints"
  | "sprintIssueService"
  | "getDashboardSettings"
  | "workspaceManager"
>;

export class SprintFinalizationService {
  constructor(
    private readonly deps: SprintFinalizationDependencies,
    private readonly renderMainMergeCiFeedback: (args: {
      repoPath: string;
      featureBranch: string;
      defaultBranch: string;
      featureBranchPrefix: string;
      sprintNumber?: number;
      sprintName?: string;
      sprintDescription?: string;
      ciIntelligence: CiIntelligenceSettings;
      githubMode: "REMOTE" | "LOCAL";
      subtasks?: Subtask[];
    }) => Promise<MergeFeedbackResult>,
    private readonly triggerAutoPromote: (projectId: string, sprintId: string) => void,
  ) {}

  async finalize(params: {
    scopedExecutionContext: SprintExecutionContext & { sprintNumber: number };
    sprintRunId: string;
    repoPath: string;
    defaultFeatureBranch: string;
    defaultBranch: string;
    featureBranchPrefix: string;
    githubMode: "REMOTE" | "LOCAL";
    ciIntelligence: CiIntelligenceSettings;
    subtasks: Subtask[];
    runningTasks: Subtask[];
    readyTasks: Subtask[];
    manualMergeTasks: Subtask[];
    needsManualMerge: boolean;
    allTerminal: boolean;
    noMoreActionPossible: boolean;
    activeMainMergeAttentionItems: Array<{ id: string; sprintRunId: string | null; attentionType: string; ownerType?: string; status?: string; summaryMarkdown: string; payload: Record<string, unknown> | null }>;
  }): Promise<{ status: "continue" | "exit" | "wait"; report: string }> {
    const {
      scopedExecutionContext, sprintRunId, repoPath, defaultFeatureBranch, defaultBranch,
      featureBranchPrefix, githubMode, ciIntelligence, subtasks, runningTasks, readyTasks,
      manualMergeTasks, needsManualMerge, allTerminal, noMoreActionPossible, activeMainMergeAttentionItems
    } = params;

    let report = "";

    this.deps.projectAttentionService.resolveItemsForSprintRun(
      scopedExecutionContext.project.id,
      sprintRunId,
      ["manual_attention"],
      "watch_loop_finished",
    );

    if (needsManualMerge) {
      this.deps.executionRepository.appendSprintRunEvent(sprintRunId, "sprint_merge_required", "system", {
        awaitingMergeCount: manualMergeTasks.length,
        taskIds: manualMergeTasks.map((task) => task.record_id || task.id),
      }, {
        sourceEventKey: \`sprint-merge-required:\${sprintRunId}\`,
      });
      report += await this.deps.renderInstruction("watchMergeRequired", {}, repoPath);
    } else if (subtasks.length > 0 && !allTerminal && noMoreActionPossible) {
      this.deps.executionRepository.appendSprintRunEvent(sprintRunId, "sprint_no_more_actions", "system", {
        taskCount: subtasks.length,
        taskIds: subtasks.map((task) => task.record_id || task.id),
      }, {
        sourceEventKey: \`sprint-no-more-actions:\${sprintRunId}\`,
      });

      report += await this.deps.renderInstruction("watchNoMoreActions", {}, repoPath);
    } else if (subtasks.length > 0 && subtasks.every((task) => isCompletedTaskSettled(task, { githubMode }))) {
      const remainingMainMergeAttentionItems = this.collectActiveMainMergeAttentionItems(this.deps.projectAttentionService, scopedExecutionContext.project.id, sprintRunId);
      if (allTerminal) {
        if (this.deps.qualityAssuranceService) {
          const qaOutcome = await this.deps.qualityAssuranceService.reviewSprintCompletion({
            sprint: scopedExecutionContext.sprint,
            subtasks,
            githubMode,
            workspaceManager: this.deps.workspaceManager,
            logger: this.deps.logger,
            renderInstruction: (templateId: InstructionTemplateId, variables: Record<string, unknown>) => this.deps.renderInstruction(templateId, variables, repoPath),
          });
          const mergeFeedback = await this.renderMainMergeCiFeedback({
            repoPath,
            featureBranch: defaultFeatureBranch,
            defaultBranch,
            featureBranchPrefix,
            sprintNumber: scopedExecutionContext.sprintNumber,
            sprintName: scopedExecutionContext.sprint.name,
            sprintDescription: scopedExecutionContext.sprint.description,
            ciIntelligence,
            githubMode,
            subtasks,
          });

          this.deps.executionRepository.appendSprintRunEvent(sprintRunId, "main_merge_gate_status", "system", {
            sprintId: scopedExecutionContext.sprint.id,
            sprintName: scopedExecutionContext.sprint.name,
            prNumber: mergeFeedback.prNumber,
            prUrl: mergeFeedback.prUrl,
            hasConflict: mergeFeedback.hasConflict,
            checksPassed: mergeFeedback.checksPassed,
            failedChecks: mergeFeedback.failedChecks,
            pendingChecks: mergeFeedback.pendingChecks,
          }, {
            sourceEventKey: \`main_merge_gate:\${sprintRunId}:\${mergeFeedback.prNumber}:\${mergeFeedback.checksPassed}\`,
          });

          if (mergeFeedback.hasConflict) {
            this.deps.projectAttentionService.openItems([buildTaskAttentionPayload({
              projectId: scopedExecutionContext.project.id,
              sprintRunId,
              attentionType: "main_merge_conflict",
              status: "open",
              severity: "high",
              ownerType: "worker",
              title: \`Main merge conflict for \${scopedExecutionContext.sprint.name}\`,
              summaryMarkdown: buildConflictSummaryMarkdown({
                repoPath,
                workingDir: \`cd \${repoPath}\`,
                conflictingBranches: {
                  source: defaultFeatureBranch,
                  target: defaultBranch,
                },
                prInfo: {
                  number: mergeFeedback.prNumber,
                  url: mergeFeedback.prUrl,
                },
                mergedTaskContexts: selectMergedTaskContexts(subtasks, { limit: 8 }),
                isMainMerge: true,
              }),
              payload: {
                prNumber: mergeFeedback.prNumber,
                prUrl: mergeFeedback.prUrl,
              }
            })]);
            this.resolveMainMergeAttentionItems(this.deps.projectAttentionService, scopedExecutionContext.project.id, sprintRunId, {
              kinds: ["ci_fix_required"],
              reason: "Conflict detected, CI fixes paused.",
              note: "Merge conflict takes priority.",
            });
            report += "Sprint completion blocked by main merge conflict.\n";
          } else {
            this.resolveMainMergeAttentionItems(this.deps.projectAttentionService, scopedExecutionContext.project.id, sprintRunId, {
              kinds: ["merge_conflict"],
              reason: "No conflict detected.",
              note: "Main branch can be cleanly merged.",
            });
          }

          if (mergeFeedback.checksPassed === false && !mergeFeedback.hasConflict) {
            this.deps.projectAttentionService.openItems([buildTaskAttentionPayload({
              projectId: scopedExecutionContext.project.id,
              sprintRunId,
              attentionType: "main_merge_ci_failure",
              status: "open",
              severity: "high",
              ownerType: "worker",
              title: \`CI checks failed on main merge for \${scopedExecutionContext.sprint.name}\`,
              summaryMarkdown: this.buildMainMergeCiFixSummary({
                featureBranch: defaultFeatureBranch,
                defaultBranch,
                prNumber: mergeFeedback.prNumber,
                prUrl: mergeFeedback.prUrl,
                failedChecks: mergeFeedback.failedChecks,
                mergedTaskContexts: selectMergedTaskContexts(subtasks, { limit: 8 }),
              }),
              payload: {
                prNumber: mergeFeedback.prNumber,
                prUrl: mergeFeedback.prUrl,
                failedChecks: mergeFeedback.failedChecks,
              }
            })]);
          } else if (mergeFeedback.checksPassed === true) {
            this.resolveMainMergeAttentionItems(this.deps.projectAttentionService, scopedExecutionContext.project.id, sprintRunId, {
              kinds: ["ci_fix_required"],
              reason: "CI checks passed.",
              note: "Integrated branch is passing CI.",
            });
          }

          const activeAttentionItems = this.collectActiveMainMergeAttentionItems(this.deps.projectAttentionService, scopedExecutionContext.project.id, sprintRunId);
          const decision = decideMainMergeWaitOrPause({
            mergeFeedback,
            activeAttentionItems,
          });

          if (decision === "wait_for_ci") {
            report += "Waiting for CI checks to complete on main merge PR...\n";
            return { status: "wait", report };
          }
          if (decision === "pause_for_human") {
            report += "Main merge is blocked by CI or conflicts, requires human escalation...\n";
            const escalated = isHumanEscalatedAttentionItem(activeAttentionItems.find(i => isMainMergeAttentionItem(i) && i.ownerType === "human"));
            if (escalated) {
              transitionSprintRun(
                this.deps.executionRepository,
                sprintRunId,
                "paused",
                "human_intervention",
                { reason: "Main merge requires human intervention" }
              );
              return { status: "exit", report };
            }
            return { status: "wait", report };
          }

          if (decision && !(githubMode === "LOCAL" && subtasks.every(task => isCompletedTaskSettled(task, { githubMode }) && task.is_merged))) {
            transitionSprintRun(
              this.deps.executionRepository,
              sprintRunId,
              "paused",
              "system",
              { reason: \`Main merge paused: \${decision}\` }
            );
            return { status: "exit", report };
          }
        }

        if (githubMode === "LOCAL") {
          const originalRef = await getCheckedOutRef(repoPath).catch(() => null);
          try {
            this.deps.logger.info(\`LOCAL Mode: Merging feature branch \${defaultFeatureBranch} into default branch \${defaultBranch}\`);
            const mainMerge = await mergeBranchLocally(
              repoPath,
              defaultBranch,
              defaultFeatureBranch,
              \`Merge sprint feature branch \${defaultFeatureBranch}\`
            );
            if (!mainMerge.success) {
              this.deps.logger.error(\`LOCAL Mode: Failed to merge feature branch \${defaultFeatureBranch} into \${defaultBranch}: \${mainMerge.error}\`);
              this.deps.projectAttentionService.openItems([buildTaskAttentionPayload({
                projectId: scopedExecutionContext.project.id,
                sprintRunId,
                attentionType: "main_merge_conflict",
                status: "open",
                severity: "high",
                ownerType: "human",
                title: \`Local merge conflict for \${scopedExecutionContext.sprint.name}\`,
                summaryMarkdown: buildConflictSummaryMarkdown({
                  repoPath,
                  workingDir: \`cd \${repoPath}\`,
                  conflictingBranches: {
                    source: defaultFeatureBranch,
                    target: defaultBranch,
                  },
                  prInfo: { number: null, url: null },
                  mergedTaskContexts: selectMergedTaskContexts(subtasks, { limit: 8 }),
                  isMainMerge: true,
                }),
                payload: null,
              })]);

              const escalated = isHumanEscalatedAttentionItem(remainingMainMergeAttentionItems.find(i => isMainMergeAttentionItem(i) && i.ownerType === "human"));
              if (escalated) {
                transitionSprintRun(
                  this.deps.executionRepository,
                  sprintRunId,
                  "paused",
                  "human_intervention",
                  { reason: "Local main merge conflict requires human intervention" }
                );
                return { status: "exit", report: "Local main merge conflict, waiting for human." };
              }
              return { status: "wait", report: "Local main merge conflict detected." };
            }
          } finally {
            if (originalRef) {
              await restoreCheckedOutRef(repoPath, originalRef).catch(() => null);
            }
          }
        }

        this.deps.completedSprints.add(\`\${scopedExecutionContext.project.id}:\${scopedExecutionContext.sprint.id}\`);
        transitionSprintRun(
          this.deps.executionRepository,
          sprintRunId,
          "completed",
          "completed",
          {
            sprintId: scopedExecutionContext.sprint.id,
            tasksTotal: subtasks.length,
            tasksCompleted: subtasks.filter((t) => t.status === "completed").length,
          }
        );
        this.deps.projectAttentionService.resolveItemsForSprintRun(
          scopedExecutionContext.project.id,
          sprintRunId,
          ["manual_attention", "sprint_paused", "main_merge_conflict", "main_merge_ci_failure"],
          "sprint_completed"
        );
        this.triggerAutoPromote(scopedExecutionContext.project.id, scopedExecutionContext.sprint.id);
        const issueCloseOutcome = await this.deps.sprintIssueService?.closeLinkedIssues(
          scopedExecutionContext.project.id,
          scopedExecutionContext.sprint.id
        );
        await this.cleanupTerminalSprintCliWorkspaces({
          projectId: scopedExecutionContext.project.id,
          sprintId: scopedExecutionContext.sprint.id,
          sprintRunId,
          repoPath,
        });
        report += await this.deps.renderInstruction("cleanupAllMerged", { planning_target: scopedExecutionContext.sprint.name }, repoPath);
        if (issueCloseOutcome?.reportText) {
          report += "\n" + issueCloseOutcome.reportText;
        }

      } else {
        this.deps.logger.warn("Failed to finalize sprint run", {
          sprintRunId,
          allTerminal,
          noMoreActionPossible,
          needsManualMerge,
          tasksCount: subtasks.length,
        });
      }
    } else {
      const completionContext = {
        subtasks,
        runningTasks,
        readyTasks,
        needsManualMerge,
        allTerminal,
        noMoreActionPossible,
      };

      const terminalDecision = decideTerminalCompletion(completionContext);
      if (terminalDecision.isTerminal) {
        if (terminalDecision.reason === "failed") {
          transitionSprintRun(
            this.deps.executionRepository,
            sprintRunId,
            "failed",
            "failed",
            { failedTasks: subtasks.filter(t => t.status === "failed").map(t => t.id) }
          );
          await this.cleanupTerminalSprintCliWorkspaces({
            projectId: scopedExecutionContext.project.id,
            sprintId: scopedExecutionContext.sprint.id,
            sprintRunId,
            repoPath,
          });
          report += await this.deps.renderInstruction("cleanupFailed", { planning_target: scopedExecutionContext.sprint.name }, repoPath);
        } else if (terminalDecision.reason === "deferred") {
          transitionSprintRun(
            this.deps.executionRepository,
            sprintRunId,
            "completed",
            "deferred",
            { deferredTasks: subtasks.filter(t => t.status === "deferred").map(t => t.id) }
          );
          report += await this.deps.renderInstruction("cleanupDeferred", {}, repoPath);
        }
      } else {
        const finalizationTransition = decideFinalizationTransition(completionContext);
        if (finalizationTransition.action === "transition_completed_empty") {
          transitionSprintRun(
            this.deps.executionRepository,
            sprintRunId,
            "completed",
            "empty",
            { note: "No valid tasks found or sprint closed before execution" }
          );
          await this.cleanupTerminalSprintCliWorkspaces({
            projectId: scopedExecutionContext.project.id,
            sprintId: scopedExecutionContext.sprint.id,
            sprintRunId,
            repoPath,
          });
          report += await this.deps.renderInstruction("cleanupEmpty", {}, repoPath);
        } else if (finalizationTransition.action === "transition_paused_system") {
          transitionSprintRun(
            this.deps.executionRepository,
            sprintRunId,
            "paused",
            "system",
            { reason: finalizationTransition.reason }
          );
        } else if (finalizationTransition.action === "open_attention_item") {
          this.deps.projectAttentionService.openItems([buildTaskAttentionPayload({
            projectId: scopedExecutionContext.project.id,
            sprintRunId,
            attentionType: "sprint_paused",
            status: "open",
            severity: "high",
            title: \`Sprint \${scopedExecutionContext.sprint.name} requires attention\`,
            summaryMarkdown: \`The sprint watch loop cannot proceed due to: \${finalizationTransition.reason}.\`,
            payload: null,
          })]);
        }
      }
    }

    if (allTerminal) {
      await runCompletionStep({ repoPath });
      const sprintRun = this.deps.executionRepository.getSprintRun(sprintRunId);
      switch (sprintRun?.status) {
        case "failed":
        case "paused":
        case "cancelled": {
          break;
        }
        case "completed": {
          const settings = this.deps.getDashboardSettings({ projectId: scopedExecutionContext.project.id, sprintId: scopedExecutionContext.sprint.id });
          if (settings.jira?.autoCloseLinkedIssues) {
            try {
              const issueCloseOutcome = await this.deps.sprintIssueService?.closeLinkedIssues(scopedExecutionContext.project.id, scopedExecutionContext.sprint.id);
              if (issueCloseOutcome?.reportText) {
                report += issueCloseOutcome.reportText;
              }
            } catch (err) {
              this.deps.logger.warn("Failed to auto-close linked issues", { sprintRunId, error: err instanceof Error ? err.message : String(err) });
            }
          }
          break;
        }
        case "unhandled":
          break;
      }
    }

    return { status: "continue", report };
  }

  private async cleanupTerminalSprintCliWorkspaces(args: {
    projectId: string;
    sprintId: string;
    sprintRunId: string;
    repoPath: string;
  }): Promise<void> {
    const dispatches = this.deps.executionRepository.listTaskDispatches({
      projectId: args.projectId,
      sprintId: args.sprintId,
      sprintRunId: args.sprintRunId,
    });
    const cleanedSessionIds = new Set<string>();

    for (const dispatch of dispatches) {
      if (dispatch.executorType !== "docker_cli") {
        continue;
      }
      const taskRun = this.deps.executionRepository.getTaskRunByDispatchId(dispatch.id);
      const sessionId = taskRun?.sessionId?.trim();
      const workspaceRefFromEvents = taskRun
        ? this.resolveWorkspaceReferenceFromTaskRunEvents(taskRun.id)
        : undefined;
      if (!sessionId || cleanedSessionIds.has(sessionId)) {
        if (workspaceRefFromEvents) {
          await this.deps.workspaceManager.removeWorktree(args.repoPath, workspaceRefFromEvents).catch(() => undefined);
        }
        continue;
      }
      cleanedSessionIds.add(sessionId);

      const worktreePath = workspaceRefFromEvents || await this.deps.workspaceManager.resolveResumeWorktreePath(
        args.repoPath,
        sessionId,
        "DOCKER",
      ).catch(() => undefined) || await this.deps.workspaceManager.resolveResumeWorktreePath(
        args.repoPath,
        sessionId,
        "HOST",
      ).catch(() => undefined);
      if (!worktreePath) {
        continue;
      }
      await this.deps.workspaceManager.removeWorktree(args.repoPath, worktreePath).catch(() => undefined);
    }
  }

  private resolveWorkspaceReferenceFromTaskRunEvents(taskRunId: string): string | undefined {
    const events = this.deps.executionRepository.listTaskRunEvents(taskRunId, 200);
    for (const event of events) {
      if (event.eventType !== "cli_workspace_bound" && event.eventType !== "cli_prepare_completed" && event.eventType !== "cli_worktree_preserved") {
        continue;
      }
      const payload = event.payload;
      if (!payload || typeof payload !== "object") {
        continue;
      }
      const worktreePath = (payload as Record<string, unknown>).worktreePath;
      if (typeof worktreePath !== "string" || worktreePath.trim().length === 0) {
        continue;
      }
      return worktreePath;
    }
    return undefined;
  }

  private resolveMainMergeAttentionItems(
    projectAttentionService: {
      listActiveProjectItems: (projectId: string) => Array<{
        id: string;
        sprintRunId: string | null;
        attentionType: string;
        ownerType?: string;
        status?: string;
        summaryMarkdown: string;
        payload: Record<string, unknown> | null;
      }>;
      resolveItem: (itemId: string, payload: { status: "resolved"; reason: string; resolutionSummaryMarkdown: string }) => void;
    },
    projectId: string,
    sprintRunId: string,
    options: {
      kinds: Array<"merge_conflict" | "ci_fix_required">;
      reason: string;
      note: string;
    },
  ): void {
    const activeItems = projectAttentionService.listActiveProjectItems(projectId);
    for (const item of activeItems) {
      if (item.sprintRunId !== sprintRunId) {
        continue;
      }
      const kind = this.mainMergeAttentionItemKind(item);
      if (!kind || !options.kinds.includes(kind)) {
        continue;
      }

      projectAttentionService.resolveItem(item.id, {
        status: "resolved",
        reason: options.reason,
        resolutionSummaryMarkdown: [
          item.summaryMarkdown.trim(),
          "",
          options.note,
        ].filter(Boolean).join("\n"),
      });
    }
  }

  private buildMainMergeCiFixSummary(args: {
    featureBranch: string;
    defaultBranch: string;
    prNumber: number | null;
    prUrl: string | null;
    failedChecks: string[];
    mergedTaskContexts: Array<{
      taskKey: string;
      taskTitle: string;
      workerBranch: string | null;
      prUrl: string | null;
    }>;
  }): string {
    const lines = [
      \`The final merge of \\\`\${args.featureBranch}\\\` into \\\`\${args.defaultBranch}\\\` is blocked by failing CI checks.\`,
      args.prNumber ? \`PR: \${args.prUrl ?? \`#\${args.prNumber}\`}\` : null,
      args.failedChecks.length > 0 ? \`Failed checks: \${args.failedChecks.join(", ")}\` : null,
      "",
      \`Check out \\\`\${args.featureBranch}\\\`, reproduce and fix the failing checks (these run against the integrated branch, so the failure may only appear when all sprint tasks are combined), then push so the checks re-run.\`,
    ];
    if (args.mergedTaskContexts.length > 0) {
      lines.push("", "Tasks merged into this branch:");
      for (const ctx of args.mergedTaskContexts) {
        lines.push(\`- \${ctx.taskKey}: \${ctx.taskTitle}\`);
      }
    }
    return lines.filter((line) => line !== null).join("\n");
  }

  private mainMergeAttentionItemKind(
    item: { attentionType: string; payload: Record<string, unknown> | null },
  ): "merge_conflict" | "ci_fix_required" | null {
    if (!isMainMergeAttentionItem(item)) {
      return null;
    }
    const sourceAttentionType = item.payload?.sourceAttentionType;
    const effectiveType = typeof sourceAttentionType === "string" ? sourceAttentionType : item.attentionType;

    if (effectiveType === "main_merge_conflict") {
      return "merge_conflict";
    }
    if (effectiveType === "main_merge_ci_failure") {
      return "ci_fix_required";
    }
    return null;
  }

  private collectActiveMainMergeAttentionItems(
    projectAttentionService: {
      listActiveProjectItems: (projectId: string) => Array<{
        id: string;
        sprintRunId: string | null;
        attentionType: string;
        ownerType?: string;
        status?: string;
        summaryMarkdown: string;
        payload: Record<string, unknown> | null;
      }>;
    },
    projectId: string,
    sprintRunId: string,
  ): Array<{
    id: string;
    sprintRunId: string | null;
    attentionType: string;
    summaryMarkdown: string;
    payload: Record<string, unknown> | null;
  }> {
    return projectAttentionService.listActiveProjectItems(projectId).filter((item) => (
      item.sprintRunId === sprintRunId && isMainMergeAttentionItem(item)
    ));
  }
}
SERVICE
