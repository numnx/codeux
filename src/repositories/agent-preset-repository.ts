import { randomUUID } from "crypto";
import type { DatabaseSync } from "node:sqlite";
import { AppDbStorage } from "./app-db-storage.js";
import type {
  AgentPresetRecord,
  CreateAgentPresetInput,
  UpdateAgentPresetInput,
} from "../contracts/agent-preset-types.js";

interface AgentPresetRow {
  id: string;
  project_id: string;
  name: string;
  instruction_markdown: string;
  labels_json: string | null;
  created_at: string;
  updated_at: string;
}

function parseLabels(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export class AgentPresetRepository {
  private readonly db: DatabaseSync;

  constructor(storage: AppDbStorage = new AppDbStorage()) {
    this.db = storage.getDatabase();
  }

  listAgentPresets(projectId: string): AgentPresetRecord[] {
    this.requireProject(projectId);
    const rows = this.db.prepare(`
      SELECT *
      FROM agent_presets
      WHERE project_id = ?
      ORDER BY updated_at DESC, created_at DESC, name ASC
    `).all(projectId) as unknown as AgentPresetRow[];

    return rows.map((row) => this.mapRow(row));
  }

  getAgentPreset(agentPresetId: string): AgentPresetRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM agent_presets
      WHERE id = ?
    `).get(agentPresetId) as AgentPresetRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  createAgentPreset(projectId: string, input: CreateAgentPresetInput): AgentPresetRecord {
    this.requireProject(projectId);
    const now = new Date().toISOString();
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO agent_presets (
        id,
        project_id,
        name,
        instruction_markdown,
        labels_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      projectId,
      input.name.trim(),
      input.instructionMarkdown?.trim() || "",
      JSON.stringify(this.normalizeLabels(input.labels)),
      now,
      now,
    );

    return this.requireAgentPreset(id);
  }

  updateAgentPreset(agentPresetId: string, input: UpdateAgentPresetInput): AgentPresetRecord {
    const current = this.requireAgentPreset(agentPresetId);
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE agent_presets
      SET name = ?, instruction_markdown = ?, labels_json = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.name?.trim() || current.name,
      input.instructionMarkdown === undefined ? current.instructionMarkdown : input.instructionMarkdown.trim(),
      JSON.stringify(input.labels === undefined ? current.labels : this.normalizeLabels(input.labels)),
      now,
      agentPresetId,
    );

    return this.requireAgentPreset(agentPresetId);
  }

  deleteAgentPreset(agentPresetId: string): void {
    this.requireAgentPreset(agentPresetId);
    this.db.prepare(`
      DELETE FROM agent_presets
      WHERE id = ?
    `).run(agentPresetId);
  }

  private mapRow(row: AgentPresetRow): AgentPresetRecord {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      instructionMarkdown: row.instruction_markdown,
      labels: parseLabels(row.labels_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private requireAgentPreset(agentPresetId: string): AgentPresetRecord {
    const record = this.getAgentPreset(agentPresetId);
    if (!record) {
      throw new Error(`Agent preset not found: ${agentPresetId}`);
    }
    return record;
  }

  private requireProject(projectId: string): void {
    const row = this.db.prepare(`
      SELECT id
      FROM projects
      WHERE id = ?
    `).get(projectId) as { id: string } | undefined;

    if (!row) {
      throw new Error(`Project not found: ${projectId}`);
    }
  }

  private normalizeLabels(labels?: string[]): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const label of labels || []) {
      const trimmed = String(label || "").trim();
      if (!trimmed || seen.has(trimmed)) {
        continue;
      }
      seen.add(trimmed);
      normalized.push(trimmed);
    }
    return normalized;
  }
}
