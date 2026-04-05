import type { ManageSprintOsArgs, ManagementResponseEnvelope } from "../contracts/internal-management-types.js";
import type { SprintPreviewService } from "../services/sprint-preview-service.js";
import type { ExecutionRepository } from "../repositories/execution-repository.js";
import { handlePreviewActions } from "./management/preview-actions.js";
import { handleTelemetryActions } from "./management/telemetry-actions.js";
import type { DashboardSettings } from "../contracts/app-types.js";

export interface ManagementToolHandlerArgs {
  sprintPreviewService: SprintPreviewService;
  executionRepository: ExecutionRepository;
  getDashboardSettings: () => DashboardSettings;
}

export class ManagementToolHandler {
  constructor(private readonly deps: ManagementToolHandlerArgs) {}

  async handleManageSprintOs(args: ManageSprintOsArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    const isDestructive = args.action.startsWith("delete_") || args.action.startsWith("reset_") || args.action.startsWith("replace_");

    if (isDestructive && args.approval?.confirmed !== true) {
      const envelope: ManagementResponseEnvelope = {
        approvalRequired: true,
        approvalMessage: `The action '${args.action}' is destructive and requires explicit approval. Please review the changes and call this tool again with approval.confirmed set to true.`,
      };
      return { content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }] };
    }

    if (args.domain === "preview") {
      const currentHost = null; // serverHost is not available on DashboardSettings, we'll fall back to localhost in preview-origin
      const envelope = await handlePreviewActions(args, this.deps.sprintPreviewService, currentHost);
      return { content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }] };
    }

    if (args.domain === "telemetry") {
      const envelope = await handleTelemetryActions(args, this.deps.executionRepository);
      return { content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }] };
    }

    // Default response for non-destructive actions or approved destructive actions
    const envelope: ManagementResponseEnvelope = {
      result: {
        status: "success",
        domain: args.domain,
        action: args.action,
        message: "Action completed successfully (stub implementation).",
      },
    };
    return { content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }] };
  }
}
