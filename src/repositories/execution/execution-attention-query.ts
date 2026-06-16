import { DatabaseAdapter } from "../db/database-adapter.js";
import { ProjectAttentionSummaryRow } from "./execution-repository-types.js";

export function queryActiveAttentionRowsForProject(db: DatabaseAdapter, projectId: string): ProjectAttentionSummaryRow[] {
    return db.prepare(`
      SELECT
        id,
        project_id,
        sprint_id,
        sprint_run_id,
        attention_type,
        severity,
        owner_type,
        status,
        title,
        summary_markdown,
        payload_json,
        updated_at
      FROM project_attention_items
      WHERE project_id = ?
        AND status IN ('open', 'claimed')
      ORDER BY updated_at DESC, opened_at DESC, id DESC
    `).all(projectId) as unknown as ProjectAttentionSummaryRow[];
}
