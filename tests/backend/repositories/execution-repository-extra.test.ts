import { afterEach, describe, expect, it } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { AppDbStorage } from "../../../src/repositories/app-db-storage.js";
import { ProjectManagementRepository } from "../../../src/repositories/project-management-repository.js";
import { ExecutionRepository } from "../../../src/repositories/execution-repository.js";

const tempDirs: string[] = [];

async function createRepositories() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sprint-os-execution-extra-"));
  tempDirs.push(dir);
  const storage = new AppDbStorage(path.join(dir, "app.db"));
  return {
    projectRepository: new ProjectManagementRepository(storage),
    executionRepository: new ExecutionRepository(storage),
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("ExecutionRepository Extra Coverage", () => {
  it("requireSprintRun throws if run not found", async () => {
    const { executionRepository } = await createRepositories();
    expect(() => executionRepository.requireSprintRun("non-existent")).toThrow("Sprint run not found: non-existent");
  });

  it("requireSprintRunScoped throws if run not found", async () => {
    const { executionRepository } = await createRepositories();
    expect(() => (executionRepository as any).requireSprintRunScoped("non-existent")).toThrow("Sprint run not found: non-existent");
  });

  it("getExecutionInvocation returns null for non-existent", async () => {
    const { executionRepository } = await createRepositories();
    expect(executionRepository.getExecutionInvocation("non-existent")).toBeNull();
  });

  it("getSprintRun returns null for non-existent", async () => {
    const { executionRepository } = await createRepositories();
    expect(executionRepository.getSprintRun("non-existent")).toBeNull();
  });

  it("getTaskDispatch returns null for non-existent", async () => {
    const { executionRepository } = await createRepositories();
    expect(executionRepository.getTaskDispatch("non-existent")).toBeNull();
  });

  it("getTaskRun returns null for non-existent", async () => {
    const { executionRepository } = await createRepositories();
    expect(executionRepository.getTaskRun("non-existent")).toBeNull();
  });

  it("listTaskDispatches throws if project not found", async () => {
    const { executionRepository } = await createRepositories();
    expect(() => executionRepository.listTaskDispatches({ projectId: "non-existent" })).toThrow("Project not found: non-existent");
  });
});
