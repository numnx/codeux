import { afterEach, describe, expect, it } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { AppDbStorage } from "../../../src/repositories/app-db-storage.js";
import { ProjectRuntimeRepository } from "../../../src/repositories/project-runtime-repository.js";
import { ProjectManagementRepository } from "../../../src/repositories/project-management-repository.js";

const tempDirs: string[] = [];

async function createRepository() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "project-runtime-extra-"));
  tempDirs.push(dir);
  const storage = new AppDbStorage(path.join(dir, "app.db"));
  return {
    runtimeRepository: new ProjectRuntimeRepository(storage),
    projectRepository: new ProjectManagementRepository(storage),
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("ProjectRuntimeRepository Extra Coverage", () => {
  it("getSelectedProjectId returns null if none selected", async () => {
    const { runtimeRepository } = await createRepository();
    expect(runtimeRepository.getSelectedProjectId()).toBeNull();
  });

  it("getSelectedSprintId returns null if no project selected", async () => {
    const { runtimeRepository } = await createRepository();
    expect(runtimeRepository.getSelectedSprintId("non-existent")).toBeNull();
  });

  it("getSelectedProjectStatus returns default if none selected", async () => {
    const { runtimeRepository } = await createRepository();
    const status = runtimeRepository.getSelectedProjectStatus();
    expect(status.projectId).toBeUndefined();
  });

  it("getSelectedProjectRepoPath returns fallback if none selected", async () => {
    const { runtimeRepository } = await createRepository();
    expect(runtimeRepository.getSelectedProjectRepoPath("/fallback")).toBe("/fallback");
  });

  it("getProjectLiveStatus handles non-existent project", async () => {
    const { runtimeRepository } = await createRepository();
    const status = runtimeRepository.getProjectLiveStatus("non-existent");
    expect(status.projectId).toBeUndefined();
  });
});
