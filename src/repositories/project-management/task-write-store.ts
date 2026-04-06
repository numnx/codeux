import type { DatabaseAdapter } from "../db/database-adapter.js";
import { validateTaskDependencies } from "./task-dependency-graph.js";
import type { TaskRecord } from "../../contracts/project-management-types.js";

export class TaskWriteStore {
  constructor(private readonly db: DatabaseAdapter) {}

  normalizeDependencyIds(
    dependencyIds: string[] | undefined,
    requireTaskCallback: (taskId: string) => void
  ): string[] {
    const seen = new Set<string>();
    const output: string[] = [];
    for (const dependencyId of dependencyIds || []) {
      const normalized = dependencyId.trim();
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      requireTaskCallback(normalized);
      seen.add(normalized);
      output.push(normalized);
    }
    return output;
  }

  saveDependencies(
    taskId: string,
    sprintId: string,
    dependsOnTaskIds: string[] | undefined,
    sprintTasks: TaskRecord[],
    requireTaskCallback: (taskId: string) => void,
    isUpdate = false
  ): string[] {
    if (!dependsOnTaskIds) {
      return [];
    }

    const normalizedDependsOnTaskIds = this.normalizeDependencyIds(dependsOnTaskIds, requireTaskCallback);

    if (normalizedDependsOnTaskIds.length > 0 || isUpdate) {
      if (normalizedDependsOnTaskIds.length > 0) {
        validateTaskDependencies(taskId, sprintId, normalizedDependsOnTaskIds, sprintTasks);
      }

      if (isUpdate) {
        const deleteDependencies = this.db.prepare(`DELETE FROM task_dependencies WHERE task_id = ?`);
        deleteDependencies.run(taskId);
      }

      const insertDependency = this.db.prepare(`
        INSERT INTO task_dependencies (task_id, depends_on_task_id)
        VALUES (?, ?)
      `);

      for (const dependencyId of normalizedDependsOnTaskIds) {
        insertDependency.run(taskId, dependencyId);
      }
    }

    return normalizedDependsOnTaskIds;
  }
}
