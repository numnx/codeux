import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectPullRequestCiSupport } from "../../../../../../src/domain/sprint/ci/feature-pr/workflow-ci-detection.js";

const repoPaths: string[] = [];

describe("detectPullRequestCiSupport", () => {
  afterEach(async () => {
    await Promise.all(repoPaths.splice(0).map((repoPath) => rm(repoPath, { recursive: true, force: true })));
  });

  it("returns not_applicable when no workflow directory exists", async () => {
    const repoPath = await createTempRepo();

    await expect(detectPullRequestCiSupport(repoPath, "feature/sprint1")).resolves.toEqual({
      status: "not_applicable",
      reason: "no_workflow_directory",
    });
  });

  it("returns applicable when a pull_request workflow matches the base branch", async () => {
    const repoPath = await createTempRepo(`
name: CI

on:
  pull_request:
    branches: ["feature/**"]
`);

    await expect(detectPullRequestCiSupport(repoPath, "feature/sprint1")).resolves.toEqual({
      status: "applicable",
      reason: "matching_pr_workflow_found",
    });
  });

  it("returns not_applicable when pull_request workflows only target other base branches", async () => {
    const repoPath = await createTempRepo(`
name: CI

on:
  pull_request:
    branches:
      - main
`);

    await expect(detectPullRequestCiSupport(repoPath, "feature/sprint1")).resolves.toEqual({
      status: "not_applicable",
      reason: "no_matching_pull_request_branches",
    });
  });
});

async function createTempRepo(workflowContent?: string): Promise<string> {
  const repoPath = await mkdtemp(path.join(os.tmpdir(), "workflow-ci-detection-"));
  repoPaths.push(repoPath);
  if (!workflowContent) {
    return repoPath;
  }

  const workflowDir = path.join(repoPath, ".github", "workflows");
  await mkdir(workflowDir, { recursive: true });
  await writeFile(path.join(workflowDir, "ci.yml"), workflowContent, "utf8");
  return repoPath;
}
