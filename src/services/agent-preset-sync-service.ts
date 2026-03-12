import * as fs from "fs/promises";
import * as path from "path";
import type { AgentPresetRecord, AgentSourceScope } from "../contracts/agent-preset-types.js";
import type { ProjectManagementRepository } from "../repositories/project-management-repository.js";
import { AgentPresetRepository } from "../repositories/agent-preset-repository.js";
import { getHomeSprintOsPath, getRepoSprintOsPath } from "../shared/config/sprint-os-paths.js";
import type { Logger } from "../shared/logging/logger.js";

interface AgentPresetSyncServiceDeps {
  projectManagementRepository: ProjectManagementRepository;
  agentPresetRepository: AgentPresetRepository;
  projectRoot: string;
  logger?: Logger;
}

interface AgentSourceFile {
  name: string;
  normalizedName: string;
  sourcePath: string;
  sourceScope: AgentSourceScope;
  sourceUpdatedAt: string;
  instructionMarkdown: string;
}

export class AgentPresetSyncService {
  constructor(private readonly deps: AgentPresetSyncServiceDeps) {}

  async listAgentPresets(projectId: string): Promise<AgentPresetRecord[]> {
    await this.syncProjectAgents(projectId);
    return await this.decorateProjectAgentPresets(projectId);
  }

  async syncProjectAgents(projectId: string): Promise<void> {
    const project = this.requireProject(projectId);
    const existingPresets = this.deps.agentPresetRepository.listAgentPresets(projectId);
    const presetsById = new Map(existingPresets.map((preset) => [preset.id, preset]));
    const presetsByName = new Map(existingPresets.map((preset) => [this.normalizeName(preset.name), preset]));
    const sourceFiles = await this.readAgentSources(project.baseDir);

    for (const source of sourceFiles) {
      const existing = existingPresets.find((preset) => preset.sourcePath === source.sourcePath)
        || presetsByName.get(source.normalizedName)
        || null;

      if (!existing) {
        const labels = source.normalizedName === "planning agent" ? ["planning"] : [];
        const created = this.deps.agentPresetRepository.importAgentPresetFromSource(projectId, {
          name: source.name,
          instructionMarkdown: source.instructionMarkdown,
          labels,
          sourcePath: source.sourcePath,
          sourceScope: source.sourceScope,
          sourceUpdatedAt: source.sourceUpdatedAt,
          sourceImportedAt: source.sourceUpdatedAt,
        });
        presetsById.set(created.id, created);
        presetsByName.set(source.normalizedName, created);
        continue;
      }

      if (
        existing.sourcePath !== source.sourcePath
        || existing.sourceScope !== source.sourceScope
        || existing.sourceUpdatedAt !== source.sourceUpdatedAt
      ) {
        const linked = this.deps.agentPresetRepository.linkAgentPresetToSource(existing.id, {
          sourcePath: source.sourcePath,
          sourceScope: source.sourceScope,
          sourceUpdatedAt: source.sourceUpdatedAt,
        });
        presetsById.set(linked.id, linked);
        presetsByName.set(source.normalizedName, linked);
      }
    }
  }

  async importAgentPresetFromMarkdown(agentPresetId: string): Promise<AgentPresetRecord> {
    const existing = this.deps.agentPresetRepository.getAgentPreset(agentPresetId);
    if (!existing) {
      throw new Error(`Agent not found: ${agentPresetId}`);
    }
    if (!existing.sourcePath) {
      throw new Error(`Agent ${existing.name} is not linked to a markdown file.`);
    }

    const source = await this.readAgentSourceFile(existing.sourcePath, existing.sourceScope || "project");
    const updated = this.deps.agentPresetRepository.importLinkedAgentPreset(agentPresetId, {
      name: source.name,
      instructionMarkdown: source.instructionMarkdown,
      sourceUpdatedAt: source.sourceUpdatedAt,
    });

    return await this.decorateAgentPreset(updated);
  }

  async getPlanningAgent(projectId: string): Promise<AgentPresetRecord> {
    await this.syncProjectAgents(projectId);
    const planningAgent = this.deps.agentPresetRepository.findAgentPresetByName(projectId, "Planning agent");
    if (!planningAgent) {
      throw new Error("Planning agent not found. Add `Planning agent.md` under `.sprint-os/agents` or create it in Agents.");
    }
    return await this.decorateAgentPreset(planningAgent);
  }

  private async decorateProjectAgentPresets(projectId: string): Promise<AgentPresetRecord[]> {
    const presets = this.deps.agentPresetRepository.listAgentPresets(projectId);
    const decorated = await Promise.all(presets.map(async (preset) => await this.decorateAgentPreset(preset)));
    return decorated.sort((left, right) => {
      if (left.syncStatus !== right.syncStatus) {
        const rank = (status: AgentPresetRecord["syncStatus"]): number => {
          switch (status) {
            case "out_of_sync":
              return 0;
            case "missing_source":
              return 1;
            case "synced":
              return 2;
            default:
              return 3;
          }
        };
        return rank(left.syncStatus) - rank(right.syncStatus);
      }
      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }

  private async decorateAgentPreset(preset: AgentPresetRecord): Promise<AgentPresetRecord> {
    if (!preset.sourcePath) {
      return {
        ...preset,
        sourceExists: false,
        syncStatus: "manual",
      };
    }

    try {
      const source = await this.readAgentSourceFile(preset.sourcePath, preset.sourceScope || "project");
      const sourceIsNewer = Boolean(
        preset.sourceImportedAt
        && new Date(source.sourceUpdatedAt).getTime() > new Date(preset.sourceImportedAt).getTime(),
      );
      return {
        ...preset,
        sourceScope: source.sourceScope,
        sourceUpdatedAt: source.sourceUpdatedAt,
        sourceExists: true,
        syncStatus: sourceIsNewer && source.instructionMarkdown.trim() !== preset.instructionMarkdown.trim()
          ? "out_of_sync"
          : "synced",
      };
    } catch {
      return {
        ...preset,
        sourceExists: false,
        syncStatus: "missing_source",
      };
    }
  }

  private async readAgentSources(repoPath: string): Promise<AgentSourceFile[]> {
    const collected = new Map<string, AgentSourceFile>();
    const roots: Array<{ directory: string; scope: AgentSourceScope }> = [
      { directory: getRepoSprintOsPath(repoPath, "agents"), scope: "project" },
      { directory: getRepoSprintOsPath(this.deps.projectRoot, "agents"), scope: "default" },
      { directory: getHomeSprintOsPath("agents"), scope: "home" },
    ];

    for (const root of roots) {
      const entries = await fs.readdir(root.directory, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
          continue;
        }
        const sourcePath = path.join(root.directory, entry.name);
        const source = await this.readAgentSourceFile(sourcePath, root.scope);
        if (!collected.has(source.normalizedName)) {
          collected.set(source.normalizedName, source);
        }
      }
    }

    return Array.from(collected.values());
  }

  private async readAgentSourceFile(sourcePath: string, sourceScope: AgentSourceScope): Promise<AgentSourceFile> {
    const stats = await fs.stat(sourcePath);
    const instructionMarkdown = await fs.readFile(sourcePath, "utf8");
    const rawName = path.basename(sourcePath, path.extname(sourcePath)).trim();
    const name = rawName.length > 0 ? rawName : "Unnamed agent";

    return {
      name,
      normalizedName: this.normalizeName(name),
      sourcePath,
      sourceScope,
      sourceUpdatedAt: stats.mtime.toISOString(),
      instructionMarkdown,
    };
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
  }

  private requireProject(projectId: string): NonNullable<ReturnType<ProjectManagementRepository["getProject"]>> {
    const project = this.deps.projectManagementRepository.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return project;
  }
}
