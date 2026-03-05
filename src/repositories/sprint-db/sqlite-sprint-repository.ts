import { DatabaseSync } from "node:sqlite";
import { ProjectId, SprintId, SprintStatus } from "../../contracts/app-types.js";
import { CreateSprintInput, Sprint, UpdateSprintInput } from "../../domain/sprints/sprint-types.js";
import { SprintRepository } from "../../domain/sprints/sprint-repository.js";
import { randomUUID } from "node:crypto";

export class SqliteSprintRepository implements SprintRepository {
  constructor(private readonly db: DatabaseSync) {}

  async create(input: CreateSprintInput): Promise<Sprint> {
    const id = randomUUID() as SprintId;
    const now = new Date().toISOString();

    // Get max order index for the project
    const orderStmt = this.db.prepare(
      "SELECT MAX(order_index) as max_index FROM pm_sprints WHERE project_id = ?"
    );
    const orderResult = orderStmt.get(input.projectId) as { max_index: number | null } | undefined;
    const orderIndex = orderResult?.max_index !== undefined && orderResult?.max_index !== null
      ? orderResult.max_index + 1
      : 0;

    const stmt = this.db.prepare(`
      INSERT INTO pm_sprints (id, project_id, name, goal, status, start_date, end_date, created_at, order_index, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.projectId,
      input.name,
      input.goal || null,
      SprintStatus.PLANNED,
      input.startDate || null,
      input.endDate || null,
      now,
      orderIndex,
      now
    );

    const created = await this.getById(id);
    if (!created) {
      throw new Error(`Failed to create sprint for project ${input.projectId}`);
    }
    return created;
  }

  async getById(id: SprintId): Promise<Sprint | null> {
    const stmt = this.db.prepare("SELECT * FROM pm_sprints WHERE id = ?");
    const row = stmt.get(id) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return this.mapRowToSprint(row);
  }

  async listByProjectId(projectId: ProjectId): Promise<Sprint[]> {
    const stmt = this.db.prepare("SELECT * FROM pm_sprints WHERE project_id = ? AND status != 'ARCHIVED' ORDER BY order_index ASC");
    const rows = stmt.all(projectId) as Record<string, unknown>[];

    return rows.map((row) => this.mapRowToSprint(row));
  }

  async update(id: SprintId, input: UpdateSprintInput): Promise<Sprint> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Sprint with id ${id} not found`);
    }

    const updates: string[] = [];
    const values: Array<string | number | null> = [];

    if (input.name !== undefined) {
      updates.push("name = ?");
      values.push(input.name);
    }
    if (input.goal !== undefined) {
      updates.push("goal = ?");
      values.push(input.goal);
    }
    if (input.status !== undefined) {
      updates.push("status = ?");
      values.push(input.status);
    }
    if (input.startDate !== undefined) {
      updates.push("start_date = ?");
      values.push(input.startDate);
    }
    if (input.endDate !== undefined) {
      updates.push("end_date = ?");
      values.push(input.endDate);
    }
    if (input.orderIndex !== undefined) {
      updates.push("order_index = ?");
      values.push(input.orderIndex);
    }

    if (updates.length === 0) {
      return existing;
    }

    const now = new Date().toISOString();
    updates.push("updated_at = ?");
    values.push(now);
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE pm_sprints
      SET ${updates.join(", ")}
      WHERE id = ?
    `);

    stmt.run(...values);

    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(`Failed to update sprint ${id}`);
    }
    return updated;
  }

  async delete(id: SprintId): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM pm_sprints WHERE id = ?");
    stmt.run(id);
  }

  async archive(id: SprintId): Promise<Sprint> {
    return this.update(id, { status: "ARCHIVED" });
  }

  async reorder(projectId: ProjectId, orderedSprintIds: SprintId[]): Promise<void> {
    this.db.exec("BEGIN TRANSACTION;");
    try {
      const stmt = this.db.prepare("UPDATE pm_sprints SET order_index = ?, updated_at = ? WHERE id = ? AND project_id = ?");
      const now = new Date().toISOString();

      for (let i = 0; i < orderedSprintIds.length; i++) {
        stmt.run(i, now, orderedSprintIds[i], projectId);
      }
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }

  private mapRowToSprint(row: Record<string, unknown>): Sprint {
    return {
      id: row.id as SprintId,
      projectId: row.project_id as ProjectId,
      name: row.name as string,
      goal: row.goal as string | null,
      status: row.status as SprintStatus | "ARCHIVED",
      startDate: row.start_date as string | null,
      endDate: row.end_date as string | null,
      orderIndex: row.order_index as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
