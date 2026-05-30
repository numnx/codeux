import { afterEach, describe, expect, it } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { AppDbStorage } from "../../../src/repositories/app-db-storage.js";
import { ProjectManagementRepository } from "../../../src/repositories/project-management-repository.js";
import { GuardrailRepository } from "../../../src/repositories/guardrail-repository.js";

const tempDirs: string[] = [];

async function createFixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "guardrail-repo-"));
  tempDirs.push(dir);
  const storage = new AppDbStorage(path.join(dir, "app.db"));
  const projects = new ProjectManagementRepository(storage);
  const project = projects.createProject({ name: "P", sourceType: "local", sourceRef: dir, defaultBranch: "main" });
  const sprint = projects.createSprint(project.id, { name: "S", number: 1 });
  const task = projects.createTask(project.id, {
    sprintId: sprint.id,
    taskKey: "T1",
    title: "Task 1",
    promptMarkdown: "do it",
    isIndependent: true,
  });
  const repo = new GuardrailRepository(storage);
  return { repo, projects, projectId: project.id, taskId: task.id };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("GuardrailRepository", () => {
  it("records invocations atomically and returns the running count", async () => {
    const { repo, projectId, taskId } = await createFixture();

    expect(repo.getCount(taskId, "ci_fix")).toBe(0);
    expect(repo.record({ projectId, taskId, purpose: "ci_fix" })).toBe(1);
    expect(repo.record({ projectId, taskId, purpose: "ci_fix" })).toBe(2);
    expect(repo.record({ projectId, taskId, purpose: "ci_fix" })).toBe(3);
    expect(repo.getCount(taskId, "ci_fix")).toBe(3);
  });

  it("tracks each purpose independently and reports getCounts + getTotal", async () => {
    const { repo, projectId, taskId } = await createFixture();

    repo.record({ projectId, taskId, purpose: "task_coding" });
    repo.record({ projectId, taskId, purpose: "task_coding" });
    repo.record({ projectId, taskId, purpose: "ci_fix" });
    repo.record({ projectId, taskId, purpose: "qa_review" });

    const counts = repo.getCounts(taskId);
    expect(counts.task_coding).toBe(2);
    expect(counts.ci_fix).toBe(1);
    expect(counts.merge_conflict).toBe(0);
    expect(counts.qa_review).toBe(1);
    expect(repo.getTotal(taskId)).toBe(4);
  });

  it("resets all counters for a task", async () => {
    const { repo, projectId, taskId } = await createFixture();

    repo.record({ projectId, taskId, purpose: "task_coding" });
    repo.record({ projectId, taskId, purpose: "ci_fix" });
    repo.reset(taskId);

    expect(repo.getTotal(taskId)).toBe(0);
    expect(repo.getCount(taskId, "task_coding")).toBe(0);
  });

  it("cascades deletes when the task is removed", async () => {
    const { repo, projects, projectId, taskId } = await createFixture();

    repo.record({ projectId, taskId, purpose: "task_coding" });
    expect(repo.getTotal(taskId)).toBe(1);

    projects.deleteTask(taskId);
    expect(repo.getTotal(taskId)).toBe(0);
  });
});
