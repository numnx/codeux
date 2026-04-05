import type { ManageSprintOsArgs, ManagementResponseEnvelope } from "../contracts/internal-management-types.js";
import type { ProjectManagementRepository } from "../repositories/project-management-repository.js";
import type { ExecutionControlService } from "../services/execution-control-service.js";
import type { ExecutionRepository } from "../repositories/execution-repository.js";
import { handleProjectAction } from "./management/project-actions.js";
import { handleSprintAction } from "./management/sprint-actions.js";

export class ManagementToolHandler {
  constructor(
    private readonly projectManagementRepository: ProjectManagementRepository,
    private readonly executionControlService: ExecutionControlService,
    private readonly executionRepository: ExecutionRepository
  ) {}

  async handleManageSprintOs(args: ManageSprintOsArgs) {
    let envelope: ManagementResponseEnvelope;

    if (args.domain === "projects") {
      envelope = handleProjectAction(
        args.action,
        args.payload,
        this.projectManagementRepository,
        args.domain,
        args.approval
      );
    } else if (args.domain === "sprints") {
      envelope = await handleSprintAction(
        args.action,
        args.payload,
        this.projectManagementRepository,
        this.executionControlService,
        this.executionRepository,
        args.domain,
        args.approval
      );
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
            message: "Action completed successfully (stub implementation).",
          },
        };
      }
    }

    return { content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }] };
  }
}
