import * as path from "path";
import { SprintDatabase } from "../../../repositories/sprint-db/bootstrap.js";
import { SqliteSprintRepository } from "../../../repositories/sprint-db/sqlite-sprint-repository.js";
import { TaskRepository } from "../../../repositories/sprint-db/task-repository.js";
import { ProjectRepository } from "../../project/project-repository.js";
import { ProjectService } from "../../project/project-service.js";
import { SubtaskFileRepository } from "../../../infrastructure/repositories/subtask-file-repository.js";
import { SprintImporter, ImportResult } from "./sprint-importer.js";

export interface MigrateSprintsOptions {
  sprintsDir: string;
  dbPath: string;
  sourceId?: string;
  baseDir?: string;
  dryRun?: boolean;
}

/**
 * Runs the sprint migration command.
 *
 * In dry-run mode, scans the sprints directory and logs what would be imported
 * without writing anything to the database.
 *
 * In execute mode, imports all legacy sprint markdown files into the SQLite DB.
 */
export async function runMigrateSprintsCommand(options: MigrateSprintsOptions): Promise<ImportResult> {
  const { sprintsDir, dbPath, dryRun = false } = options;
  const resolvedSprintsDir = path.resolve(sprintsDir);
  const sourceId = options.sourceId ?? "cli-migration";
  const baseDir = options.baseDir ?? resolvedSprintsDir;

  const sprintDb = new SprintDatabase(dbPath);
  const projectRepo = new ProjectRepository(sprintDb.db);
  const projectService = new ProjectService(projectRepo);
  const sprintRepo = new SqliteSprintRepository(sprintDb.db);
  const taskRepo = new TaskRepository(sprintDb);
  const subtaskRepo = new SubtaskFileRepository();

  const importer = new SprintImporter(subtaskRepo, projectService, sprintRepo, taskRepo);

  const result = await importer.importSprints(sourceId, baseDir, resolvedSprintsDir, { dryRun });
  return result;
}

/**
 * Parses migrate-sprints CLI arguments from argv.
 * Supports:
 *   --sprints-dir <path>
 *   --db-path <path>
 *   --source-id <id>
 *   --base-dir <dir>
 *   --dry-run
 */
export function parseMigrateSprintsArgs(argv: string[]): MigrateSprintsOptions | null {
  const args = argv.slice(2);
  const migrateIndex = args.indexOf("--migrate-sprints");
  if (migrateIndex === -1) return null;

  const remaining = args.slice(migrateIndex + 1);

  const getArg = (flag: string): string | undefined => {
    const inlineIdx = remaining.findIndex((a) => a.startsWith(`${flag}=`));
    if (inlineIdx !== -1) {
      return remaining[inlineIdx].split("=").slice(1).join("=");
    }
    const idx = remaining.indexOf(flag);
    if (idx !== -1 && remaining[idx + 1] && !remaining[idx + 1].startsWith("-")) {
      return remaining[idx + 1];
    }
    return undefined;
  };

  const sprintsDir = getArg("--sprints-dir");
  if (!sprintsDir) {
    return null;
  }

  const dbPath = getArg("--db-path") ?? ".jules-subagents/sprint.db";
  const sourceId = getArg("--source-id");
  const baseDir = getArg("--base-dir");
  const dryRun = remaining.includes("--dry-run");

  return { sprintsDir, dbPath, sourceId, baseDir, dryRun };
}

/**
 * Formats and prints the import result to the console.
 */
export function printImportResult(result: ImportResult): void {
  if (result.dryRun) {
    console.log("[DRY RUN] No changes were made to the database.");
    console.log(`Would import ${result.sprintsCount} sprint(s) with ${result.tasksCount} task(s) total:`);
  } else {
    console.log(`Imported ${result.sprintsCount} sprint(s) with ${result.tasksCount} task(s) total:`);
  }

  for (const sprint of result.sprints) {
    console.log(`  - ${sprint.sprintName}: ${sprint.taskCount} task(s)`);
  }
}
