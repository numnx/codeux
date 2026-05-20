import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectActions } from "../../../src/mcp/management/project-actions.js";
import { ProjectManagementRepository } from "../../../src/repositories/project-management-repository.js";

describe("ProjectActions", () => {
  let repository: ProjectManagementRepository;
  let projectActions: ProjectActions;

  beforeEach(() => {
    repository = {
      listProjects: vi.fn(),
      getProject: vi.fn(),
      createProject: vi.fn(),
      updateProject: vi.fn(),
      setSelectedProjectId: vi.fn(),
      deleteProject: vi.fn(),
    } as unknown as ProjectManagementRepository;

    projectActions = new ProjectActions(repository);
  });

  it("lists projects", async () => {
    const mockResult = { projects: [], selectedProjectId: null };
    vi.mocked(repository.listProjects).mockReturnValue(mockResult);

    const result = await projectActions.handleProjectAction({ action: "list", payload: {}, domain: "projects" });
    expect(repository.listProjects).toHaveBeenCalled();
    expect(result.result).toEqual(mockResult);
  });

  it("gets project", async () => {
    const mockProject = { id: "p1" };
    vi.mocked(repository.getProject).mockReturnValue(mockProject as any);

    const result = await projectActions.handleProjectAction({ action: "get", payload: { projectId: "p1" }, domain: "projects" });
    expect(repository.getProject).toHaveBeenCalledWith("p1");
    expect(result.result).toEqual(mockProject);
  });

  it("creates project", async () => {
    const mockProject = { id: "p1" };
    vi.mocked(repository.createProject).mockReturnValue(mockProject as any);

    const input = { name: "test", sourceType: "local", sourceRef: "." };
    const result = await projectActions.handleProjectAction({ action: "create", payload: input, domain: "projects" });
    expect(repository.createProject).toHaveBeenCalledWith(input);
    expect(result.result).toEqual(mockProject);
  });

  it("updates project", async () => {
    const mockProject = { id: "p1" };
    vi.mocked(repository.updateProject).mockReturnValue(mockProject as any);

    const input = { projectId: "p1", name: "test-update" };
    const result = await projectActions.handleProjectAction({ action: "update", payload: input, domain: "projects" });
    expect(repository.updateProject).toHaveBeenCalledWith("p1", input);
    expect(result.result).toEqual(mockProject);
  });

  it("selects project", async () => {
    vi.mocked(repository.setSelectedProjectId).mockReturnValue("p1");

    const result = await projectActions.handleProjectAction({ action: "select", payload: { projectId: "p1" }, domain: "projects" });
    expect(repository.setSelectedProjectId).toHaveBeenCalledWith("p1");
    expect(result.result).toEqual({ selectedProjectId: "p1" });
  });

  it("requires approval for delete", async () => {
    const result = await projectActions.handleProjectAction({ action: "delete", payload: { projectId: "p1" }, domain: "projects" });
    expect(result.approvalRequired).toBe(true);
    expect(repository.deleteProject).not.toHaveBeenCalled();
  });

  it("deletes project with approval", async () => {
    const result = await projectActions.handleProjectAction({ action: "delete", payload: { projectId: "p1" }, domain: "projects", approval: { confirmed: true } });
    expect(repository.deleteProject).toHaveBeenCalledWith("p1");
    expect(result.result).toEqual({ status: "success", deletedProjectId: "p1" });
  });
});
