import type { PipelineContext } from "./pipeline-context.js";
import { LEARNINGS_FILENAME } from "../../../contracts/memory-types.js";

export async function executeMemoryCaptureStage(
  ctx: PipelineContext,
): Promise<{ memoriesCaptured: number }> {
  if (!ctx.settings.memory?.enabled || !ctx.settings.memory.autoCaptureSprint) {
    return { memoriesCaptured: 0 };
  }

  const memoryService = ctx.deps.memoryService;
  if (!memoryService) {
    return { memoriesCaptured: 0 };
  }

  let projectId: string | undefined;
  let sprintId: string | undefined;

  if (ctx.taskRunId && ctx.deps.executionRepository) {
    const taskRun = ctx.deps.executionRepository.getTaskRun(ctx.taskRunId);
    if (taskRun) {
      projectId = taskRun.projectId;
      sprintId = taskRun.sprintId ?? undefined;
    }
  }

  if (!projectId) {
    return { memoriesCaptured: 0 };
  }

  const captured = await memoryService.captureMemoriesFromWorktree(
    projectId,
    sprintId,
    ctx.agentPresetId ?? null,
    ctx.worktreePath,
    ctx.taskRunId || ctx.sessionId
  );

  if (captured > 0) {
    ctx.deps.sessionTracking.appendActivity(ctx.sessionId, {
      originator: "system",
      description: `Captured ${captured} learnings from ${LEARNINGS_FILENAME}.`,
    });
  }

  return { memoriesCaptured: captured };
}
