import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DashboardSnapshotCachePolicy } from "../../../../src/app/lifecycle/dashboard-snapshot-cache-policy.js";
import { DashboardSnapshotCache, mapExecutionConnections, mapAssignedWorkers, mapAttentionItems } from "../../../../src/app/lifecycle/dashboard-snapshot-cache.js";

describe("DashboardSnapshotCache", () => {
  let mockDeps: any;
  let cache: DashboardSnapshotCache;

  beforeEach(() => {
    mockDeps = {
      projectManagementRepository: {
        listProjects: vi.fn().mockReturnValue({ projects: [] }),
      },
      executionRepository: {
        getOverviewTelemetrySnapshot: vi.fn().mockReturnValue({ activeProjects: [] }),
        getProjectExecutionSnapshot: vi.fn().mockReturnValue({ projectId: "p1" }),
        getProjectStatsSnapshot: vi.fn().mockReturnValue({ stats: true }),
      },
      connectionChatRepository: {
        listConnections: vi.fn().mockReturnValue([]),
      },
      projectWorkerAssignmentRepository: {
        listAssignmentsForProject: vi.fn().mockReturnValue([]),
      },
      projectAttentionRepository: {
        listProjectAttentionItems: vi.fn().mockReturnValue([]),
      },
    };
    cache = new DashboardSnapshotCache(mockDeps);
  });


  describe("DashboardSnapshotCachePolicy", () => {

    it("generates stable cache keys for project execution queries", () => {
      const key1 = DashboardSnapshotCachePolicy.getProjectExecutionCacheKey("p1");
      const key2 = DashboardSnapshotCachePolicy.getProjectExecutionCacheKey("p1");
      expect(key1).toBe(key2);
      expect(key1).toBe("p1:");

      const key3 = DashboardSnapshotCachePolicy.getProjectExecutionCacheKey("p1", { selectedSprintId: "s1" });
      expect(key1).not.toBe(key3);
      expect(key3).toBe("p1:s1");
    });

    it("matches execution cache keys correctly for invalidation", () => {
      expect(DashboardSnapshotCachePolicy.isProjectExecutionCacheKeyMatch("p1:", "p1")).toBe(true);
      expect(DashboardSnapshotCachePolicy.isProjectExecutionCacheKeyMatch("p1:s1", "p1")).toBe(true);
      expect(DashboardSnapshotCachePolicy.isProjectExecutionCacheKeyMatch("p2:", "p1")).toBe(false);
      expect(DashboardSnapshotCachePolicy.isProjectExecutionCacheKeyMatch("p12:", "p1")).toBe(false);
    });

    it("generates stable cache keys for project stats queries", () => {
      const key1 = DashboardSnapshotCachePolicy.getProjectStatsCacheKey("p1", { window: "7d" });
      const key2 = DashboardSnapshotCachePolicy.getProjectStatsCacheKey("p1", { window: "7d" });
      expect(key1).toBe(key2);
      expect(key1).toBe('p1:{"window":"7d"}');

      const key3 = DashboardSnapshotCachePolicy.getProjectStatsCacheKey("p1", { window: "30d" });
      expect(key1).not.toBe(key3);
    });

    it("matches cache keys correctly for invalidation", () => {
      const key1 = DashboardSnapshotCachePolicy.getProjectStatsCacheKey("p1", { window: "7d" });
      expect(DashboardSnapshotCachePolicy.isProjectStatsCacheKeyMatch(key1, "p1")).toBe(true);
      expect(DashboardSnapshotCachePolicy.isProjectStatsCacheKeyMatch(key1, "p2")).toBe(false);
    });
  });

  describe("lean execution snapshot", () => {
    const baseSnapshot = () => ({
      projectId: "p1",
      projectName: "P1",
      sprintRuns: [{ id: "r1", status: "running" }],
      taskDispatches: [],
      recentEvents: [{ id: "e1" }, { id: "e2" }],
      recentInvocations: [{ id: "i1" }],
    });

    it("strips the activity feed from the lean view while the full view keeps it", () => {
      mockDeps.executionRepository.getProjectExecutionSnapshot.mockReturnValue(baseSnapshot());

      const full = cache.getProjectExecutionSnapshot("p1");
      const lean = cache.getProjectExecutionSnapshotLean("p1");

      expect(full.recentEvents).toHaveLength(2);
      expect(full.recentInvocations).toHaveLength(1);
      expect(lean.recentEvents).toEqual([]);
      expect(lean.recentInvocations).toEqual([]);
      // The ledger-relevant data is preserved.
      expect(lean.sprintRuns).toEqual(full.sprintRuns);
    });

    it("returns a referentially stable lean view for an unchanged snapshot", () => {
      mockDeps.executionRepository.getProjectExecutionSnapshot.mockReturnValue(baseSnapshot());
      const lean1 = cache.getProjectExecutionSnapshotLean("p1");
      const lean2 = cache.getProjectExecutionSnapshotLean("p1");
      expect(lean1).toBe(lean2);
    });


    it("regenerates lean snapshot when full snapshot instance changes (e.g. after invalidation)", () => {
      mockDeps.executionRepository.getProjectExecutionSnapshot.mockReturnValueOnce(baseSnapshot());
      const lean1 = cache.getProjectExecutionSnapshotLean("p1");

      cache.invalidateProjectExecution("p1");

      mockDeps.executionRepository.getProjectExecutionSnapshot.mockReturnValueOnce(baseSnapshot());
      const lean2 = cache.getProjectExecutionSnapshotLean("p1");

      expect(lean1).not.toBe(lean2);
    });

    it("returns the snapshot as-is when there is no feed to strip", () => {
      mockDeps.executionRepository.getProjectExecutionSnapshot.mockReturnValue({
        projectId: "p1",
        sprintRuns: [],
        recentEvents: [],
        recentInvocations: [],
      });
      const full = cache.getProjectExecutionSnapshot("p1");
      const lean = cache.getProjectExecutionSnapshotLean("p1");
      expect(lean).toBe(full);
    });
  });

  describe("snapshots caching", () => {

    describe("TTL expiry", () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });
      afterEach(() => {
        vi.useRealTimers();
      });

      it("expires project snapshots", () => {
        cache.getProjectsSnapshot();
        expect(mockDeps.projectManagementRepository.listProjects).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(DashboardSnapshotCachePolicy.PROJECTS_CACHE_TTL_MS + 1);
        cache.getProjectsSnapshot();
        expect(mockDeps.projectManagementRepository.listProjects).toHaveBeenCalledTimes(2);
      });

      it("expires overview telemetry snapshots", () => {
        cache.getOverviewTelemetrySnapshot();
        expect(mockDeps.executionRepository.getOverviewTelemetrySnapshot).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(DashboardSnapshotCachePolicy.OVERVIEW_CACHE_TTL_MS + 1);
        cache.getOverviewTelemetrySnapshot();
        expect(mockDeps.executionRepository.getOverviewTelemetrySnapshot).toHaveBeenCalledTimes(2);
      });

      it("expires project execution snapshots", () => {
        cache.getProjectExecutionSnapshot("p1");
        expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(DashboardSnapshotCachePolicy.PROJECT_EXECUTION_CACHE_TTL_MS + 1);
        cache.getProjectExecutionSnapshot("p1");
        expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenCalledTimes(2);
      });

      it("expires project stats snapshots", () => {
        cache.getProjectStatsSnapshot("p1");
        expect(mockDeps.executionRepository.getProjectStatsSnapshot).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(DashboardSnapshotCachePolicy.PROJECT_STATS_CACHE_TTL_MS + 1);
        cache.getProjectStatsSnapshot("p1");
        expect(mockDeps.executionRepository.getProjectStatsSnapshot).toHaveBeenCalledTimes(2);
      });
    });

    it("caches project snapshots", () => {
      const snap1 = cache.getProjectsSnapshot();
      const snap2 = cache.getProjectsSnapshot();
      expect(snap1).toBe(snap2);
      expect(mockDeps.projectManagementRepository.listProjects).toHaveBeenCalledTimes(1);
    });

    it("caches overview telemetry", () => {
      const snap1 = cache.getOverviewTelemetrySnapshot();
      const snap2 = cache.getOverviewTelemetrySnapshot();
      expect(snap1).toBe(snap2);
      expect(mockDeps.executionRepository.getOverviewTelemetrySnapshot).toHaveBeenCalledTimes(1);
    });

    it("caches project execution snapshots", () => {
      const snap1 = cache.getProjectExecutionSnapshot("p1");
      const snap2 = cache.getProjectExecutionSnapshot("p1");
      expect(snap1).toBe(snap2);
      expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenCalledTimes(1);
    });

    it("caches selected sprint execution snapshots separately", () => {
      const defaultSnap = cache.getProjectExecutionSnapshot("p1");
      const selectedSnap = cache.getProjectExecutionSnapshot("p1", { selectedSprintId: "sprint-1" });
      const selectedSnapAgain = cache.getProjectExecutionSnapshot("p1", { selectedSprintId: "sprint-1" });

      expect(selectedSnapAgain).toBe(selectedSnap);
      expect(selectedSnap).not.toBe(defaultSnap);
      expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenCalledTimes(2);
      expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenNthCalledWith(1, "p1", {});
      expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenNthCalledWith(2, "p1", {
        selectedSprintId: "sprint-1",
      });
    });


    it("caches project stats snapshots", () => {
      const snap1 = cache.getProjectStatsSnapshot("p1");
      const snap2 = cache.getProjectStatsSnapshot("p1");
      expect(snap1).toBe(snap2); // Immutability: returned snapshot identity is preserved
      expect(mockDeps.executionRepository.getProjectStatsSnapshot).toHaveBeenCalledTimes(1);
    });
  });


    describe("eviction", () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });
      afterEach(() => {
        vi.useRealTimers();
      });

      it("evicts oldest project execution snapshots when limit is exceeded", () => {
        for (let i = 0; i < 55; i++) {
          cache.getProjectExecutionSnapshot(`p${i}`);
        }

        expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenCalledTimes(55);

        // p0..p4 were evicted.
        cache.getProjectExecutionSnapshot("p0");
        expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenCalledTimes(56);

        // When p0 was inserted, p5 was evicted!
        // p54 is still in the cache.
        cache.getProjectExecutionSnapshot("p54");
        expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenCalledTimes(56);
      });

      it("evicts oldest project stats snapshots when limit is exceeded", () => {
        for (let i = 0; i < 55; i++) {
          cache.getProjectStatsSnapshot(`p${i}`);
        }

        expect(mockDeps.executionRepository.getProjectStatsSnapshot).toHaveBeenCalledTimes(55);

        // p0..p4 were evicted.
        cache.getProjectStatsSnapshot("p0");
        expect(mockDeps.executionRepository.getProjectStatsSnapshot).toHaveBeenCalledTimes(56);

        // p54 is still in the cache.
        cache.getProjectStatsSnapshot("p54");
        expect(mockDeps.executionRepository.getProjectStatsSnapshot).toHaveBeenCalledTimes(56);
      });
    });

  describe("invalidation", () => {
    it("invalidates project execution", () => {
      cache.getProjectExecutionSnapshot("p1");
      cache.getProjectExecutionSnapshot("p1", { selectedSprintId: "sprint-1" });
      cache.invalidateProjectExecution("p1");
      cache.getProjectExecutionSnapshot("p1");
      cache.getProjectExecutionSnapshot("p1", { selectedSprintId: "sprint-1" });
      expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenCalledTimes(4);
    });

    it("invalidates project stats", () => {
      cache.getProjectStatsSnapshot("p1", { window: "7d" });
      cache.invalidateProjectStats("p1");
      cache.getProjectStatsSnapshot("p1", { window: "7d" });
      expect(mockDeps.executionRepository.getProjectStatsSnapshot).toHaveBeenCalledTimes(2);
    });

    it("invalidates overview", () => {
      cache.getOverviewTelemetrySnapshot();
      cache.invalidateOverview();
      cache.getOverviewTelemetrySnapshot();
      expect(mockDeps.executionRepository.getOverviewTelemetrySnapshot).toHaveBeenCalledTimes(2);
    });

    it("invalidates projects", () => {
      cache.getProjectsSnapshot();
      cache.invalidateProjects();
      cache.getProjectsSnapshot();
      expect(mockDeps.projectManagementRepository.listProjects).toHaveBeenCalledTimes(2);
    });




    it("invalidates all", () => {
      cache.getProjectsSnapshot();
      cache.getOverviewTelemetrySnapshot();
      cache.getProjectExecutionSnapshot("p1");
      cache.getProjectStatsSnapshot("p1");

      cache.invalidateAll();

      cache.getProjectsSnapshot();
      cache.getOverviewTelemetrySnapshot();
      cache.getProjectExecutionSnapshot("p1");
      cache.getProjectStatsSnapshot("p1");

      expect(mockDeps.projectManagementRepository.listProjects).toHaveBeenCalledTimes(2);
      expect(mockDeps.executionRepository.getOverviewTelemetrySnapshot).toHaveBeenCalledTimes(2);
      expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenCalledTimes(2);
      expect(mockDeps.executionRepository.getProjectStatsSnapshot).toHaveBeenCalledTimes(2);
    });

    it("reuses cached project execution snapshot before mutation", () => {
      const snap1 = cache.getProjectExecutionSnapshot("p1");
      const snap2 = cache.getProjectExecutionSnapshot("p1");
      expect(snap1).toBe(snap2);
      expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenCalledTimes(1);
    });


    it("invalidates project execution scoped by project", () => {
      cache.getProjectExecutionSnapshot("p1");
      cache.getProjectExecutionSnapshot("p2");
      cache.invalidateProjectExecution("p1");

      cache.getProjectExecutionSnapshot("p1"); // Should hit DB
      cache.getProjectExecutionSnapshot("p2"); // Should hit Cache

      expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenCalledTimes(3);
      expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenNthCalledWith(1, "p1", {});
      expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenNthCalledWith(2, "p2", {});
      expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenNthCalledWith(3, "p1", {});
    });

    it("invalidates project stats scoped by project", () => {
      cache.getProjectStatsSnapshot("p1");
      cache.getProjectStatsSnapshot("p2");
      cache.invalidateProjectStats("p1");

      cache.getProjectStatsSnapshot("p1"); // Should hit DB
      cache.getProjectStatsSnapshot("p2"); // Should hit Cache

      expect(mockDeps.executionRepository.getProjectStatsSnapshot).toHaveBeenCalledTimes(3);
    });

    it("invalidates project execution snapshot after mutation event via invalidator", () => {
      const snap1 = cache.getProjectExecutionSnapshot("p1");
      cache.invalidateProjectExecution("p1");
      const snap3 = cache.getProjectExecutionSnapshot("p1");
      expect(snap1).not.toBe(snap3);
      expect(mockDeps.executionRepository.getProjectExecutionSnapshot).toHaveBeenCalledTimes(2);
    });

  });

  describe("mapping functions", () => {
    it("maps execution connections", () => {
      const result = mapExecutionConnections([
        {
          id: "conn1",
          connectionKey: "key1",
          displayName: "Conn 1",
          role: "worker",
          transport: "stdio",
          status: "connected",
          capabilities: { model: "m", instruction: "i", labels: ["l1"], listenMode: true },
          lastHeartbeatAt: "now",
          projectIds: ["p1"],
          activeProjectIds: ["p1"],
          tasksRunCount: 0,
          threadCount: 0,
          messageCount: 0,
          pendingInboxCount: 0,
          activeDispatchCount: 0,
        } as any
      ]);
      expect(result[0].id).toBe("conn1");
    });

    it("maps assigned workers", () => {
      const result = mapAssignedWorkers([
        {
          id: "a1",
          assignmentRole: "primary",
          capabilities: {}
        } as any
      ]);
      expect(result.primaryAssignedWorker?.assignmentId).toBe("a1");
    });

    it("maps attention items", () => {
      const result = mapAttentionItems([
        {
          id: "att1",
          attentionType: "t",
          severity: "high"
        } as any
      ]);
      expect(result[0].id).toBe("att1");
    });
  });
});
