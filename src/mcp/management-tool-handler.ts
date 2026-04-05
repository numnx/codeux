import type { ManageSprintOsArgs, ManagementResponseEnvelope } from "../contracts/internal-management-types.js";
import type { SprintPreviewService } from "../services/sprint-preview-service.js";
import type { ExecutionRepository } from "../repositories/execution-repository.js";
import type { DashboardSettings } from "../contracts/app-types.js";
import type { ProjectManagementRepository } from "../repositories/project-management-repository.js";
import type { ExecutionControlService } from "../services/execution-control-service.js";
import type { TaskRerunService } from "../services/task-rerun-service.js";
import { handlePreviewActions } from "./management/preview-actions.js";
import { handleTelemetryActions } from "./management/telemetry-actions.js";
import { handleProjectAction } from "./management/project-actions.js";
import { handleSprintAction } from "./management/sprint-actions.js";
import { TaskActions } from "./management/task-actions.js";

export interface ManagementToolHandlerDeps {
  sprintPreviewService: SprintPreviewService;
  executionRepository: ExecutionRepository;
  getDashboardSettings: () => DashboardSettings;
  projectManagementRepository: ProjectManagementRepository;
  executionControlService: ExecutionControlService;
  taskRerunService: TaskRerunService;
}

export class ManagementToolHandler {
  private readonly taskActions: TaskActions;

  constructor(private readonly deps: ManagementToolHandlerDeps) {
    this.taskActions = new TaskActions(
      deps.projectManagementRepository,
      deps.executionControlService,
      deps.executionRepository,
      deps.taskRerunService
    );
  }

  async handleManageSprintOs(args: ManageSprintOsArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      let envelope: ManagementResponseEnvelope;

      if (args.domain === "projects") {
        envelope = await handleProjectAction(
          args.action,
          args.payload,
          this.deps.projectManagementRepository,
          args.domain,
          args.approval
        );
      } else if (args.domain === "sprints") {
        envelope = await handleSprintAction(
          args.action,
          args.payload,
          this.deps.projectManagementRepository,
          this.deps.executionControlService,
          this.deps.executionRepository,
          args.domain,
          args.approval
        );
      } else if (args.domain === "tasks") {
        envelope = await this.taskActions.handleTaskAction(args);
      } else if (args.domain === "preview") {
        const currentHost = null; // serverHost is not available on DashboardSettings, we'll fall back to localhost in preview-origin
        envelope = await handlePreviewActions(args, this.deps.sprintPreviewService, currentHost);
      } else if (args.domain === "telemetry") {
        envelope = await handleTelemetryActions(args, this.deps.executionRepository);
      } else {
        const isDestructive = args.action.startsWith("delete_") || args.action.startsWith("reset_") || args.action.startsWith("replace_");

        if (isDestructive && args.approval?.confirmed !== true) {
          envelope = {
            approvalRequired: true,
            approvalMessage: `The action '${args.action}' is destructive and requires explicit approval. Please review the changes and call this tool again with approval.confirmed set to true.`,
          };
        } else {
          envelope = {
            result: {
              status: "success",
              domain: args.domain,
              action: args.action,
              message: `Domain ${args.domain} is not implemented yet.`,
            },
          };
        }
      }

      return { content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }] };
    } catch (error) {
      const envelope: ManagementResponseEnvelope = {
        result: {
          status: "error",
          domain: args.domain,
          action: args.action,
          message: error instanceof Error ? error.message : String(error),
        },
      };
      return { content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }] };
    }
  }
}
