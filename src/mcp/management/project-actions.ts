import type { ProjectManagementRepository } from "../../repositories/project-management-repository.js";
import type { ManagementResponseEnvelope, ManageCodeUxArgs } from "../../contracts/internal-management-types.js";
import type { CreateProjectInput, UpdateProjectInput } from "../../contracts/project-management-types.js";

export class ProjectActions {
  constructor(private readonly repository: ProjectManagementRepository) {}

  async handleProjectAction(args: ManageCodeUxArgs): Promise<ManagementResponseEnvelope> {
    const { action, payload, approval } = args;
    const safePayload = payload || {};

    switch (action) {
      case "list":
        return this.listProjects();
      case "get":
        return this.getProject(safePayload);
      case "create":
        return this.createProject(safePayload);
      case "update":
        return this.updateProject(safePayload);
      case "select":
        return this.selectProject(safePayload);
      case "delete":
        return this.deleteProject(args);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private listProjects(): ManagementResponseEnvelope {
    const result = this.repository.listProjects();
    return { result };
  }

  private getProject(payload: Record<string, unknown>): ManagementResponseEnvelope {
    const projectId = payload.projectId as string;
    if (!projectId) {
      throw new Error("Missing projectId in payload");
    }
    const result = this.repository.getProject(projectId);
    return { result };
  }

  private createProject(payload: Record<string, unknown>): ManagementResponseEnvelope {
    const input = payload as unknown as CreateProjectInput;
    const result = this.repository.createProject(input);
    return { result };
  }

  private updateProject(payload: Record<string, unknown>): ManagementResponseEnvelope {
    const projectId = payload.projectId as string;
    if (!projectId) {
      throw new Error("Missing projectId in payload");
    }
    const input = payload as unknown as UpdateProjectInput;
    const result = this.repository.updateProject(projectId, input);
    return { result };
  }

  private selectProject(payload: Record<string, unknown>): ManagementResponseEnvelope {
    const projectId = payload.projectId as string | null;
    const result = this.repository.setSelectedProjectId(projectId);
    return { result: { selectedProjectId: result } };
  }

  private deleteProject(args: ManageCodeUxArgs): ManagementResponseEnvelope {
    const projectId = args.payload?.projectId as string;
    if (!projectId) {
      throw new Error("Missing projectId in payload");
    }
    if (args.approval?.confirmed !== true) {
      return {
        approvalRequired: true,
        approvalMessage: `The action 'delete' is destructive and requires explicit approval. Please review the changes and call this tool again with approval.confirmed set to true.`,
      };
    }
    this.repository.deleteProject(projectId);
    return { result: { status: "success", deletedProjectId: projectId } };
  }
}
