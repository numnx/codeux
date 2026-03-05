import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as os from "os";
import * as path from "path";
import { DatabaseSync } from "node:sqlite";
import { SprintImporter } from "../../../../src/domain/sprint/migration/sprint-importer.js";
import { ProjectRepository } from "../../../../src/domain/project/project-repository.js";
import { ProjectService } from "../../../../src/domain/project/project-service.js";
import { SqliteSprintRepository } from "../../../../src/repositories/sprint-db/sqlite-sprint-repository.js";
import { SprintDatabase } from "../../../../src/repositories/sprint-db/bootstrap.js";
import { TaskRepository } from "../../../../src/repositories/sprint-db/task-repository.js";
import { SubtaskFileRepository } from "../../../../src/infrastructure/repositories/subtask-file-repository.js";
import {
  parseMigrateSprintsArgs,
  printImportResult,
} from "../../../../src/domain/sprint/migration/migrate-sprints-command.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a minimal sprint subtask markdown file. */
const makeSubtaskMd = (id: string, title: string, dependsOn: string[] = []) => {
  const depsYaml =
    dependsOn.length > 0
      ? `depends_on: [${dependsOn.map((d) => `"${d}"`).join(", ")}]\n`
      : `depends_on: []\n`;
  return `title: ${title}\n${depsYaml}is_independent: true\nmerged: false\nprompt:\n# ${title}\n\nSome description.\n`;
};

/** Builds a temporary sprints directory with sprint sub-directories and task files. */
async function buildSprintsFixture(
  sprintDefs: Array<{ name: string; tasks: Array<{ id: string; title: string }> }>
): Promise<string> {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-sprints-"));

  for (const sprint of sprintDefs) {
    const sprintDir = path.join(baseDir, sprint.name);
    await fs.mkdir(sprintDir, { recursive: true });

    for (const task of sprint.tasks) {
      const content = makeSubtaskMd(task.id, task.title);
      await fs.writeFile(path.join(sprintDir, `${task.id}.md`), content, "utf-8");
    }
  }

  return baseDir;
}

/** Sets up an in-memory (file-based in /tmp) SprintDatabase for testing. */
function createTestDb(dbPath: string): { sprintDb: SprintDatabase; db: DatabaseSync } {
  const sprintDb = new SprintDatabase(dbPath);
  return { sprintDb, db: sprintDb.db };
}

// ---------------------------------------------------------------------------
// Tests: SprintImporter
// ---------------------------------------------------------------------------

describe("SprintImporter", () => {
  let sprintsDir: string;
  let dbPath: string;
  let sprintDb: SprintDatabase;

  beforeEach(async () => {
    // Create a unique tmp db path
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "importer-db-"));
    dbPath = path.join(tmp, "sprint.db");
    const setup = createTestDb(dbPath);
    sprintDb = setup.sprintDb;
  });

  afterEach(async () => {
    try {
      sprintDb.db.close();
    } catch {
      // ignore if already closed
    }
    if (fsSync.existsSync(dbPath)) fsSync.unlinkSync(dbPath);
    if (sprintsDir && fsSync.existsSync(sprintsDir)) {
      await fs.rm(sprintsDir, { recursive: true, force: true });
    }
  });

  const buildImporter = (db: SprintDatabase) => {
    const projectRepo = new ProjectRepository(db.db);
    const projectService = new ProjectService(projectRepo);
    const sprintRepo = new SqliteSprintRepository(db.db);
    const taskRepo = new TaskRepository(db);
    const subtaskRepo = new SubtaskFileRepository();
    return new SprintImporter(subtaskRepo, projectService, sprintRepo, taskRepo);
  };

  it("dry-run: returns correct counts without writing to DB", async () => {
    sprintsDir = await buildSprintsFixture([
      { name: "sprint1-subtasks", tasks: [{ id: "t01", title: "Task 1" }, { id: "t02", title: "Task 2" }] },
      { name: "sprint2-subtasks", tasks: [{ id: "t01", title: "Sprint 2 Task 1" }] },
    ]);

    const importer = buildImporter(sprintDb);
    const result = await importer.importSprints("test-src", "/base", sprintsDir, { dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.sprintsCount).toBe(2);
    expect(result.tasksCount).toBe(3);
    expect(result.sprints).toHaveLength(2);

    // Verify nothing was written to DB
    const dbSprints = sprintDb.db.prepare("SELECT COUNT(*) AS cnt FROM pm_sprints").get() as { cnt: number };
    expect(dbSprints.cnt).toBe(0);
    const dbTasks = sprintDb.db.prepare("SELECT COUNT(*) AS cnt FROM pm_tasks").get() as { cnt: number };
    expect(dbTasks.cnt).toBe(0);
  });

  it("execute: imports sprints and tasks into DB and returns correct counts", async () => {
    sprintsDir = await buildSprintsFixture([
      { name: "sprint1-subtasks", tasks: [{ id: "t01", title: "Task 1" }, { id: "t02", title: "Task 2" }] },
      { name: "sprint2-subtasks", tasks: [{ id: "t01", title: "Sprint 2 Task 1" }] },
    ]);

    const importer = buildImporter(sprintDb);
    const result = await importer.importSprints("test-src", "/base", sprintsDir, { dryRun: false });

    expect(result.dryRun).toBe(false);
    expect(result.sprintsCount).toBe(2);
    expect(result.tasksCount).toBe(3);
    expect(result.sprints).toHaveLength(2);

    // Verify DB was written
    const dbSprints = sprintDb.db.prepare("SELECT COUNT(*) AS cnt FROM pm_sprints").get() as { cnt: number };
    expect(dbSprints.cnt).toBe(2);
    const dbTasks = sprintDb.db.prepare("SELECT COUNT(*) AS cnt FROM pm_tasks").get() as { cnt: number };
    expect(dbTasks.cnt).toBe(3);
  });

  it("execute: defaulting dryRun=false imports correctly", async () => {
    sprintsDir = await buildSprintsFixture([
      { name: "sprint1-subtasks", tasks: [{ id: "t01", title: "Task A" }] },
    ]);

    const importer = buildImporter(sprintDb);
    const result = await importer.importSprints("test-src", "/base", sprintsDir);

    expect(result.dryRun).toBe(false);
    expect(result.sprintsCount).toBe(1);
    expect(result.tasksCount).toBe(1);

    const dbTasks = sprintDb.db.prepare("SELECT COUNT(*) AS cnt FROM pm_tasks").get() as { cnt: number };
    expect(dbTasks.cnt).toBe(1);
  });

  it("dry-run with empty sprints directory returns zero counts", async () => {
    sprintsDir = await fs.mkdtemp(path.join(os.tmpdir(), "empty-sprints-"));

    const importer = buildImporter(sprintDb);
    const result = await importer.importSprints("test-src", "/base", sprintsDir, { dryRun: true });

    expect(result.sprintsCount).toBe(0);
    expect(result.tasksCount).toBe(0);
    expect(result.sprints).toHaveLength(0);
  });

  it("execute logs sprint names and task counts in result", async () => {
    sprintsDir = await buildSprintsFixture([
      { name: "sprint3-subtasks", tasks: [{ id: "t01", title: "Alpha" }, { id: "t02", title: "Beta" }, { id: "t03", title: "Gamma" }] },
    ]);

    const importer = buildImporter(sprintDb);
    const result = await importer.importSprints("src-1", "/my/project", sprintsDir, { dryRun: false });

    expect(result.sprints[0].sprintName).toBe("Sprint 3");
    expect(result.sprints[0].taskCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Tests: parseMigrateSprintsArgs
// ---------------------------------------------------------------------------

describe("parseMigrateSprintsArgs", () => {
  it("returns null when --migrate-sprints flag is absent", () => {
    const result = parseMigrateSprintsArgs(["node", "index.js", "--api-key", "abc"]);
    expect(result).toBeNull();
  });

  it("returns null when --sprints-dir is missing", () => {
    const result = parseMigrateSprintsArgs(["node", "index.js", "--migrate-sprints"]);
    expect(result).toBeNull();
  });

  it("parses --sprints-dir with space separator", () => {
    const result = parseMigrateSprintsArgs([
      "node", "index.js",
      "--migrate-sprints",
      "--sprints-dir", "/path/to/sprints",
    ]);
    expect(result).not.toBeNull();
    expect(result!.sprintsDir).toBe("/path/to/sprints");
    expect(result!.dryRun).toBe(false);
  });

  it("parses --dry-run flag", () => {
    const result = parseMigrateSprintsArgs([
      "node", "index.js",
      "--migrate-sprints",
      "--sprints-dir", "/sprints",
      "--dry-run",
    ]);
    expect(result!.dryRun).toBe(true);
  });

  it("parses --db-path, --source-id, --base-dir", () => {
    const result = parseMigrateSprintsArgs([
      "node", "index.js",
      "--migrate-sprints",
      "--sprints-dir", "/s",
      "--db-path", "/custom/sprint.db",
      "--source-id", "my-source",
      "--base-dir", "/my/base",
    ]);
    expect(result!.dbPath).toBe("/custom/sprint.db");
    expect(result!.sourceId).toBe("my-source");
    expect(result!.baseDir).toBe("/my/base");
  });

  it("uses default db path when --db-path not provided", () => {
    const result = parseMigrateSprintsArgs([
      "node", "index.js",
      "--migrate-sprints",
      "--sprints-dir", "/s",
    ]);
    expect(result!.dbPath).toBe(".jules-subagents/sprint.db");
  });

  it("parses inline = syntax for --sprints-dir", () => {
    const result = parseMigrateSprintsArgs([
      "node", "index.js",
      "--migrate-sprints",
      "--sprints-dir=/path/inline",
    ]);
    expect(result!.sprintsDir).toBe("/path/inline");
  });
});

// ---------------------------------------------------------------------------
// Tests: printImportResult
// ---------------------------------------------------------------------------

describe("printImportResult", () => {
  it("prints dry-run summary", () => {
    const lines: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => lines.push(args.join(" "));

    printImportResult({
      dryRun: true,
      sprintsCount: 2,
      tasksCount: 5,
      sprints: [
        { sprintName: "Sprint 1", taskCount: 3 },
        { sprintName: "Sprint 2", taskCount: 2 },
      ],
    });

    console.log = origLog;

    expect(lines.some((l) => l.includes("[DRY RUN]"))).toBe(true);
    expect(lines.some((l) => l.includes("2 sprint(s)"))).toBe(true);
    expect(lines.some((l) => l.includes("5 task(s)"))).toBe(true);
    expect(lines.some((l) => l.includes("Sprint 1") && l.includes("3 task(s)"))).toBe(true);
  });

  it("prints execute summary without dry-run marker", () => {
    const lines: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => lines.push(args.join(" "));

    printImportResult({
      dryRun: false,
      sprintsCount: 1,
      tasksCount: 2,
      sprints: [{ sprintName: "Sprint 1", taskCount: 2 }],
    });

    console.log = origLog;

    expect(lines.some((l) => l.includes("[DRY RUN]"))).toBe(false);
    expect(lines.some((l) => l.includes("Imported 1 sprint(s)"))).toBe(true);
  });
});
