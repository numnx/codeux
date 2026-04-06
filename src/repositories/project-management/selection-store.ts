import type { DatabaseAdapter } from "../db/database-adapter.js";

const SELECTED_PROJECT_KEY = "selected_project_id";

export class SelectionStore {
  constructor(private readonly db: DatabaseAdapter) {}

  getSelectedProjectId(): string | null {
    const row = this.db.prepare(`
      SELECT payload
      FROM app_settings
      WHERE key = ?
    `).get(SELECTED_PROJECT_KEY) as { payload: string } | undefined;

    if (!row) {
      return null;
    }

    try {
      const parsed = JSON.parse(row.payload) as { projectId?: string | null };
      return parsed.projectId ?? null;
    } catch {
      return null;
    }
  }

  setSelectedProjectId(projectId: string | null): string | null {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO app_settings (key, payload, updated_at)
      VALUES (?, ?, ?)
      ${this.db.dialect.upsert(["key"], ["payload", "updated_at"])}
    `).run(
      SELECTED_PROJECT_KEY,
      JSON.stringify({ projectId }),
      now
    );

    return projectId;
  }

  getSelectedSprintId(projectId: string): string | null {
    const row = this.db.prepare(`
      SELECT payload
      FROM app_settings
      WHERE key = ?
    `).get(`selected_sprint_id_${projectId}`) as { payload: string } | undefined;

    if (!row) {
      return null;
    }

    try {
      const parsed = JSON.parse(row.payload) as { sprintId?: string | null };
      return parsed.sprintId ?? null;
    } catch {
      return null;
    }
  }

  setSelectedSprintId(projectId: string, sprintId: string | null): string | null {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO app_settings (key, payload, updated_at)
      VALUES (?, ?, ?)
      ${this.db.dialect.upsert(["key"], ["payload", "updated_at"])}
    `).run(
      `selected_sprint_id_${projectId}`,
      JSON.stringify({ sprintId }),
      now
    );

    return sprintId;
  }
}
