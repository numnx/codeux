import { afterEach, describe, expect, it } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { AppDbStorage } from "../../../src/repositories/app-db-storage.js";
import { ProjectManagementRepository } from "../../../src/repositories/project-management-repository.js";
import { AgentPresetRepository } from "../../../src/repositories/agent-preset-repository.js";
import { AgentPresetSyncService } from "../../../src/services/agent-preset-sync-service.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("AgentPresetSyncService", () => {
  it("imports project markdown agents and detects out-of-sync changes", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sprint-os-agent-sync-"));
    tempDirs.push(dir);

    const repoPath = path.join(dir, "repo");
    await fs.mkdir(path.join(repoPath, ".sprint-os", "agents"), { recursive: true });
    const agentPath = path.join(repoPath, ".sprint-os", "agents", "Planning agent.md");
    await fs.writeFile(agentPath, "Initial planning instructions.\n", "utf8");

    const storage = new AppDbStorage(path.join(dir, "app.db"));
    const projectRepository = new ProjectManagementRepository(storage);
    const agentPresetRepository = new AgentPresetRepository(storage);
    const syncService = new AgentPresetSyncService({
      projectManagementRepository: projectRepository,
      agentPresetRepository,
      projectRoot: dir,
    });

    const project = projectRepository.createProject({
      name: "Planning Project",
      sourceType: "local",
      sourceRef: repoPath,
    });

    const imported = await syncService.listAgentPresets(project.id);
    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({
      name: "Planning agent",
      sourceScope: "project",
      syncStatus: "synced",
      sourceExists: true,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    await fs.writeFile(agentPath, "Updated planning instructions.\n", "utf8");

    const drifted = await syncService.listAgentPresets(project.id);
    expect(drifted[0]?.syncStatus).toBe("out_of_sync");
    expect(drifted[0]?.instructionMarkdown).toContain("Initial planning instructions");

    const reimported = await syncService.importAgentPresetFromMarkdown(drifted[0]!.id);
    expect(reimported.syncStatus).toBe("synced");
    expect(reimported.instructionMarkdown).toContain("Updated planning instructions");
  });
});
