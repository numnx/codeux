import { describe, expect, it, beforeEach } from "vitest";
import { SqliteDatabaseAdapter } from "../../../../src/repositories/db/sqlite-database-adapter.js";
import { AppDbStorage } from "../../../../src/repositories/app-db-storage.js";
import { queryProjectExecutionSnapshot } from "../../../../src/repositories/execution/project-execution-snapshot-query.js";
import { APP_DB_SCHEMA_TABLES } from "../../../../src/repositories/db/app-db-schema.js";

describe("queryProjectExecutionSnapshot", () => {
  let db: SqliteDatabaseAdapter;
  let storage: AppDbStorage;

  beforeEach(() => {
    db = new SqliteDatabaseAdapter(":memory:");
    storage = new AppDbStorage(db);
    db.exec(APP_DB_SCHEMA_TABLES);
  });

  it("returns recent events limited to the default bound", () => {
    const projectId = "proj-1";
    const sprintId = "sprint-1";
    const sprintRunId = "run-1";

    seedProject(db, projectId, "Test Project");
    seedSprint(db, sprintId, projectId, "Sprint 1", 1);
    seedSprintRun(db, sprintRunId, projectId, sprintId);

    // Create more than 300 events with valid incremental timestamps
    const baseTime = new Date('2026-06-13T10:00:00Z').getTime();
    for (let i = 1; i <= 350; i++) {
      const createdAt = new Date(baseTime + i * 1000).toISOString();
      seedSprintRunEvent(db, `event-${i}`, sprintRunId, "test_event", "system", { index: i }, createdAt);
    }

    const deps = {
      getWallTimeTotalsByTaskIds: () => new Map(),
      getWallTimeTotalsBySprintRunIds: () => new Map(),
      getUsageTotalsByTaskIds: () => new Map(),
      getUsageTotalsBySprintRunIds: () => new Map(),
    };

    const snapshot = queryProjectExecutionSnapshot(db, storage, projectId, deps);

    // Default limit should be respected
    expect(snapshot.recentEvents.length).toBe(300);
    
    // Should contain the newest events, but in chronological order (index 51 to 350)
    const eventIndices = snapshot.recentEvents.map(e => (e.payload as any).index);
    expect(Math.max(...eventIndices)).toBe(350);
    expect(Math.min(...eventIndices)).toBe(51); 
    
    // Verify chronological order (oldest to newest)
    expect(eventIndices[0]).toBe(51);
    expect(eventIndices[299]).toBe(350);
  });

  it("returns recent events limited to an explicit custom bound", () => {
    const projectId = "proj-2";
    const sprintId = "sprint-2";
    const sprintRunId = "run-2";

    seedProject(db, projectId, "Custom Limit Project");
    seedSprint(db, sprintId, projectId, "Sprint 2", 2);
    seedSprintRun(db, sprintRunId, projectId, sprintId);

    const baseTime = new Date('2026-06-13T11:00:00Z').getTime();
    for (let i = 1; i <= 100; i++) {
      const createdAt = new Date(baseTime + i * 1000).toISOString();
      seedSprintRunEvent(db, `event-2-${i}`, sprintRunId, "test_event", "system", { index: i }, createdAt);
    }

    const deps = {
      getWallTimeTotalsByTaskIds: () => new Map(),
      getWallTimeTotalsBySprintRunIds: () => new Map(),
      getUsageTotalsByTaskIds: () => new Map(),
      getUsageTotalsBySprintRunIds: () => new Map(),
    };

    const snapshot = queryProjectExecutionSnapshot(db, storage, projectId, deps, { recentEventsLimit: 50 });

    expect(snapshot.recentEvents.length).toBe(50);
    const eventIndices = snapshot.recentEvents.map(e => (e.payload as any).index);
    expect(Math.max(...eventIndices)).toBe(100);
    expect(Math.min(...eventIndices)).toBe(51);
    
    expect(eventIndices[0]).toBe(51);
    expect(eventIndices[49]).toBe(100);
  });

  function seedProject(db: SqliteDatabaseAdapter, id: string, name: string) {
    db.prepare("INSERT INTO projects (id, name, slug, base_dir, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      id, name, id, "/tmp", new Date().toISOString(), new Date().toISOString()
    );
  }

  function seedSprint(db: SqliteDatabaseAdapter, id: string, projectId: string, name: string, number: number) {
    db.prepare("INSERT INTO sprints (id, project_id, name, number, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id, projectId, name, number, id, new Date().toISOString(), new Date().toISOString()
    );
  }

  function seedSprintRun(db: SqliteDatabaseAdapter, id: string, projectId: string, sprintId: string) {
    db.prepare("INSERT INTO sprint_runs (id, project_id, sprint_id, status, trigger_type, executor_mode, created_at, updated_at) VALUES (?, ?, ?, 'running', 'manual', 'auto', ?, ?)").run(
      id, projectId, sprintId, new Date().toISOString(), new Date().toISOString()
    );
  }

  function seedSprintRunEvent(db: SqliteDatabaseAdapter, id: string, sprintRunId: string, eventType: string, originator: string, payload: any, createdAt: string) {
    db.prepare("INSERT INTO sprint_run_events (id, sprint_run_id, event_type, originator, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      id, sprintRunId, eventType, originator, JSON.stringify(payload), createdAt
    );
  }
});
