import type { ManageSprintOsArgs, ManagementResponseEnvelope } from "../contracts/internal-management-types.js";

export class ManagementToolHandler {
  async handleManageSprintOs(args: ManageSprintOsArgs) {
    const isDestructive = args.action.startsWith("delete_") || args.action.startsWith("reset_") || args.action.startsWith("replace_");

    if (isDestructive && args.approval?.confirmed !== true) {
      const envelope: ManagementResponseEnvelope = {
        approvalRequired: true,
        approvalMessage: `The action '${args.action}' is destructive and requires explicit approval. Please review the changes and call this tool again with approval.confirmed set to true.`,
      };
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
