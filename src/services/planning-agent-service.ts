import type { AgentPresetRecord } from "../contracts/agent-preset-types.js";
import type { TaskExecutorType, TaskPriority } from "../contracts/project-management-types.js";
import type { McpConnectionRecord, McpConnectionRole } from "../contracts/connection-chat-types.js";
import type { ProjectManagementRepository } from "../repositories/project-management-repository.js";
import type { ConnectionChatRepository } from "../repositories/connection-chat-repository.js";
import type { AgentPresetSyncService } from "./agent-preset-sync-service.js";
import type { ExecutionControlService } from "./execution-control-service.js";
import type { Logger } from "../shared/logging/logger.js";

interface PlanningAgentServiceDeps {
  projectManagementRepository: ProjectManagementRepository;
  connectionChatRepository: ConnectionChatRepository;
  agentPresetSyncService: AgentPresetSyncService;
  executionControlService: ExecutionControlService;
  logger?: Logger;
}

interface ImprovePromptInput {
  name: string;
  goal: string;
}

interface ImprovePromptResult {
  goal: string;
  threadId: string;
  agentId: string;
  workerConnectionId: string;
}

interface PlanSprintResult {
  ok: true;
  threadId: string;
  agentId: string;
  createdTaskIds: string[];
  started: boolean;
}

interface PlannedTaskDraft {
  key: string;
  title: string;
  description: string;
  promptMarkdown: string;
  priority?: TaskPriority;
  executorType?: TaskExecutorType;
  dependsOn?: string[];
}

interface PlannedSprintPayload {
  goal?: string;
  tasks: PlannedTaskDraft[];
}

export class PlanningAgentService {
  constructor(private readonly deps: PlanningAgentServiceDeps) {}

  async improveSprintPrompt(projectId: string, input: ImprovePromptInput): Promise<ImprovePromptResult> {
    const project = this.requireProject(projectId);
    const planningAgent = await this.deps.agentPresetSyncService.getPlanningAgent(projectId);
    const worker = this.requirePlanningWorker(projectId);
    const thread = this.deps.connectionChatRepository.createThread(projectId, {
      title: `Planning agent · ${input.name.trim() || "Untitled sprint"} · Improve`,
      connectionId: worker.id,
    });

    const reply = await this.postRequestAndWaitForReply(projectId, thread.id, worker.id, this.buildImprovePrompt({
      projectName: project.name,
      planningAgent,
      sprintName: input.name,
      goal: input.goal,
    }));
    const payload = this.parseJsonReply<{ goal?: string }>(reply.bodyMarkdown);
    const goal = String(payload.goal || "").trim();
    if (!goal) {
      throw new Error("Planning agent reply did not include an improved sprint prompt.");
    }

    return {
      goal,
      threadId: thread.id,
      agentId: planningAgent.id,
      workerConnectionId: worker.id,
    };
  }

  async planSprint(projectId: string, sprintId: string, options: { autoStart: boolean }): Promise<PlanSprintResult> {
    const project = this.requireProject(projectId);
    const sprint = this.requireSprint(projectId, sprintId);
    const planningAgent = await this.deps.agentPresetSyncService.getPlanningAgent(projectId);
    const worker = this.requirePlanningWorker(projectId);
    const existingTasks = this.deps.projectManagementRepository.listTasks(projectId, sprintId);
    if (existingTasks.length > 0) {
      throw new Error(`Sprint ${sprint.name} already has ${existingTasks.length} task(s). Clear or edit them before running Planning agent.`);
    }

    const thread = this.deps.connectionChatRepository.createThread(projectId, {
      title: `Planning agent · ${sprint.name} · Plan`,
      connectionId: worker.id,
    });

    const reply = await this.postRequestAndWaitForReply(projectId, thread.id, worker.id, this.buildPlanPrompt({
      projectName: project.name,
      planningAgent,
      sprintNumber: sprint.number,
      sprintName: sprint.name,
      goal: sprint.goal,
    }));
    const payload = this.parsePlannedSprintReply(reply.bodyMarkdown);
    if (payload.goal && payload.goal.trim() && payload.goal.trim() !== sprint.goal.trim()) {
      this.deps.projectManagementRepository.updateSprint(sprint.id, {
        goal: payload.goal.trim(),
      });
    }

    const createdTaskIds: string[] = [];
    const taskIdsByKey = new Map<string, string>();
    for (let index = 0; index < payload.tasks.length; index += 1) {
      const task = payload.tasks[index]!;
      const dependsOnTaskIds = (task.dependsOn || []).map((dependencyKey) => {
        const dependencyId = taskIdsByKey.get(dependencyKey);
        if (!dependencyId) {
          throw new Error(`Planning agent returned dependency "${dependencyKey}" before defining it.`);
        }
        return dependencyId;
      });

      const created = this.deps.projectManagementRepository.createTask(projectId, {
        sprintId,
        title: task.title.trim(),
        description: task.description.trim(),
        promptMarkdown: task.promptMarkdown.trim(),
        priority: this.normalizePriority(task.priority),
        executorType: this.normalizeExecutor(task.executorType),
        dependsOnTaskIds,
        sortOrder: index,
        status: "pending",
        isIndependent: dependsOnTaskIds.length === 0,
      });
      createdTaskIds.push(created.id);
      taskIdsByKey.set(task.key, created.id);
    }

    if (options.autoStart) {
      await this.deps.executionControlService.orchestrateSprint(projectId, sprintId);
    }

    return {
      ok: true,
      threadId: thread.id,
      agentId: planningAgent.id,
      createdTaskIds,
      started: options.autoStart,
    };
  }

  private async postRequestAndWaitForReply(
    projectId: string,
    threadId: string,
    connectionId: string,
    bodyMarkdown: string,
  ): Promise<{ bodyMarkdown: string }> {
    const sentMessage = this.deps.connectionChatRepository.postDashboardMessage(projectId, {
      threadId,
      connectionId,
      bodyMarkdown,
    });
    const timeoutAt = Date.now() + 45_000;

    while (Date.now() < timeoutAt) {
      const reply = this.deps.connectionChatRepository
        .listMessages(threadId)
        .find((message) => (
          message.direction === "connection_to_dashboard"
          && new Date(message.createdAt).getTime() >= new Date(sentMessage.createdAt).getTime()
        ));
      if (reply) {
        return reply;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Planning agent request timed out while waiting for worker reply in thread ${threadId}.`);
  }

  private buildImprovePrompt(args: {
    projectName: string;
    planningAgent: AgentPresetRecord;
    sprintName: string;
    goal: string;
  }): string {
    return [
      "You are Sprint OS's Planning agent.",
      "",
      "## Planning Agent Instructions",
      args.planningAgent.instructionMarkdown.trim() || "Refine sprint prompts into crisp, implementation-ready scopes.",
      "",
      "## Task",
      "Improve the sprint prompt only. Do not break it into tasks yet.",
      `Project: ${args.projectName}`,
      `Sprint: ${args.sprintName.trim() || "Untitled sprint"}`,
      "",
      "## Current Prompt",
      args.goal.trim() || "No prompt provided.",
      "",
      "## Required Output",
      "Return JSON only with this exact shape and no surrounding commentary:",
      '{"goal":"Improved sprint prompt"}',
    ].join("\n");
  }

  private buildPlanPrompt(args: {
    projectName: string;
    planningAgent: AgentPresetRecord;
    sprintNumber: number | null;
    sprintName: string;
    goal: string;
  }): string {
    return [
      "You are Sprint OS's Planning agent.",
      "",
      "## Planning Agent Instructions",
      args.planningAgent.instructionMarkdown.trim() || "Break sprint goals into actionable subtasks.",
      "",
      "## Task",
      "Plan the sprint into implementation-ready subtasks.",
      `Project: ${args.projectName}`,
      `Sprint: ${args.sprintNumber ? `SPR-${args.sprintNumber}` : args.sprintName}`,
      `Sprint Name: ${args.sprintName}`,
      "",
      "## Sprint Goal",
      args.goal.trim() || "No sprint goal provided.",
      "",
      "## Constraints",
      "- Prefer 3 to 8 tasks.",
      "- Each task must be independently understandable.",
      "- Dependencies must only reference keys defined earlier in the task list.",
      "- Use `auto` executor unless a task clearly needs `mcp_worker`, `docker_cli`, or `jules`.",
      "",
      "## Required Output",
      "Return JSON only with this exact shape and no surrounding commentary:",
      '{"goal":"Optional refined sprint goal","tasks":[{"key":"TASK-1","title":"Task title","description":"Short intent","promptMarkdown":"Detailed instructions for the task executor","priority":"medium","executorType":"auto","dependsOn":[]}]}',
    ].join("\n");
  }

  private parsePlannedSprintReply(bodyMarkdown: string): PlannedSprintPayload {
    const payload = this.parseJsonReply<PlannedSprintPayload>(bodyMarkdown);
    if (!Array.isArray(payload.tasks) || payload.tasks.length === 0) {
      throw new Error("Planning agent reply did not include any tasks.");
    }

    const tasks = payload.tasks.map((task, index) => {
      const key = String(task.key || "").trim() || `TASK-${index + 1}`;
      const title = String(task.title || "").trim();
      const description = String(task.description || "").trim();
      const promptMarkdown = String(task.promptMarkdown || "").trim();
      if (!title || !promptMarkdown) {
        throw new Error(`Planning agent returned an incomplete task for key ${key}.`);
      }
      return {
        key,
        title,
        description,
        promptMarkdown,
        priority: task.priority,
        executorType: task.executorType,
        dependsOn: Array.isArray(task.dependsOn)
          ? task.dependsOn.map((dependency) => String(dependency || "").trim()).filter(Boolean)
          : [],
      };
    });

    return {
      goal: typeof payload.goal === "string" ? payload.goal : undefined,
      tasks,
    };
  }

  private parseJsonReply<T>(bodyMarkdown: string): T {
    const trimmed = bodyMarkdown.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const rawJson = fencedMatch?.[1]?.trim() || trimmed;

    try {
      return JSON.parse(rawJson) as T;
    } catch (error) {
      this.deps.logger?.warn("Failed to parse Planning agent reply", {
        bodyMarkdown,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Planning agent reply was not valid JSON.");
    }
  }

  private normalizePriority(value: string | undefined): TaskPriority {
    if (value === "critical" || value === "high" || value === "medium" || value === "low") {
      return value;
    }
    return "medium";
  }

  private normalizeExecutor(value: string | undefined): TaskExecutorType {
    if (value === "auto" || value === "mcp_worker" || value === "docker_cli" || value === "jules") {
      return value;
    }
    return "auto";
  }

  private requirePlanningWorker(projectId: string): McpConnectionRecord {
    const connections = this.deps.connectionChatRepository.listConnections(projectId);
    const preferredRoles: McpConnectionRole[] = ["worker", "listener"];
    const worker = preferredRoles
      .flatMap((role) => connections.filter((connection) => connection.role === role))
      .find((connection) => (
        connection.capabilities.listenMode === true
        && ["connected", "listening", "idle"].includes(connection.status)
      ));
    if (!worker) {
      throw new Error("No connected listen-mode planning connection is available for this project.");
    }
    return worker;
  }

  private requireProject(projectId: string): NonNullable<ReturnType<ProjectManagementRepository["getProject"]>> {
    const project = this.deps.projectManagementRepository.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return project;
  }

  private requireSprint(
    projectId: string,
    sprintId: string,
  ): NonNullable<ReturnType<ProjectManagementRepository["getSprint"]>> {
    const sprint = this.deps.projectManagementRepository.getSprint(sprintId);
    if (!sprint || sprint.projectId !== projectId) {
      throw new Error(`Sprint not found in project: ${sprintId}`);
    }
    return sprint;
  }
}
