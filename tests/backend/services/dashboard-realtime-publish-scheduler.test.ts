import { describe, expect, it, vi } from "vitest";
import { DashboardRealtimePublishScheduler } from "../../../src/services/dashboard-realtime-publish-scheduler.js";

describe("DashboardRealtimePublishScheduler", () => {
  it("computes throttle delays correctly", () => {
    expect(DashboardRealtimePublishScheduler.getThrottleDelay(0, 5000, 10000)).toBe(0);
    expect(DashboardRealtimePublishScheduler.getThrottleDelay(10000, 5000, 12000)).toBe(3000);
    expect(DashboardRealtimePublishScheduler.getThrottleDelay(10000, 5000, 16000)).toBe(0);
  });

  it("calculates next delay", () => {
    expect(DashboardRealtimePublishScheduler.getNextDelay(null, 500)).toBe(500);
    expect(DashboardRealtimePublishScheduler.getNextDelay(1000, 500)).toBe(500);
    expect(DashboardRealtimePublishScheduler.getNextDelay(100, 500)).toBe(100);
  });

  it("generates stable fingerprints", () => {
    const p1 = { id: 1, updatedAt: "now", nested: { a: 1, timestamp: 123 } };
    const p2 = { id: 1, updatedAt: "later", nested: { a: 1, timestamp: 456 } };
    const p3 = { id: 2, updatedAt: "now", nested: { a: 1, timestamp: 123 } };

    expect(DashboardRealtimePublishScheduler.getFingerprint(p1)).toBe(DashboardRealtimePublishScheduler.getFingerprint(p2));
    expect(DashboardRealtimePublishScheduler.getFingerprint(p1)).not.toBe(DashboardRealtimePublishScheduler.getFingerprint(p3));
  });

  describe("buildPublishTask", () => {
    const createDeps = () => ({
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      metrics: { increment: vi.fn() },
      fingerprints: { get: vi.fn(), set: vi.fn() },
      publishRawEvent: vi.fn(),
    });

    it("returns a delay task when throttled", () => {
      const deps = createDeps();
      const result = DashboardRealtimePublishScheduler.buildPublishTask(
        {
          now: 1000,
          lastPublishedAt: 800,
          minIntervalMs: 500,
          scopeType: "project",
          scopeId: "p1",
          eventType: "test.updated",
          entityType: "test",
          entityId: "t1",
          loader: () => ({}),
          onPublished: vi.fn(),
        },
        deps
      );

      expect(result.waitMs).toBe(300);
      expect(result.task).toBeNull();
      expect(deps.metrics.increment).toHaveBeenCalledWith("test.updated", "throttled");
    });

    it("publishes immediately when not throttled", async () => {
      const deps = createDeps();
      const onPublished = vi.fn();
      const payload = { value: 123 };
      const loader = vi.fn().mockResolvedValue(payload);

      const result = DashboardRealtimePublishScheduler.buildPublishTask(
        {
          now: 1000,
          lastPublishedAt: 0,
          minIntervalMs: 500,
          scopeType: "project",
          scopeId: "p1",
          eventType: "test.updated",
          entityType: "test",
          entityId: "t1",
          loader,
          onPublished,
        },
        deps
      );

      expect(result.waitMs).toBe(0);
      expect(result.task).toBeInstanceOf(Promise);

      await result.task;

      expect(loader).toHaveBeenCalled();
      expect(deps.publishRawEvent).toHaveBeenCalledWith(expect.objectContaining({ payload }));
      expect(deps.metrics.increment).toHaveBeenCalledWith("test.updated", "published");
      expect(onPublished).toHaveBeenCalledWith(1000);
    });

    it("skips duplicates and updates metrics", async () => {
      const deps = createDeps();
      const payload = { same: true };
      deps.fingerprints.get.mockReturnValue(DashboardRealtimePublishScheduler.getFingerprint(payload));

      const result = DashboardRealtimePublishScheduler.buildPublishTask(
        {
          now: 1000,
          lastPublishedAt: 0,
          minIntervalMs: 500,
          scopeType: "project",
          scopeId: "p1",
          eventType: "test.updated",
          entityType: "test",
          entityId: "t1",
          loader: () => payload,
          cacheKey: "cache-key",
          skipDuplicate: true,
          onPublished: vi.fn(),
        },
        deps
      );

      await result.task;

      expect(deps.publishRawEvent).not.toHaveBeenCalled();
      expect(deps.metrics.increment).toHaveBeenCalledWith("test.updated", "unchanged");
    });

    it("increments failures metric when loader throws", async () => {
      const deps = createDeps();
      const result = DashboardRealtimePublishScheduler.buildPublishTask(
        {
          now: 1000,
          lastPublishedAt: 0,
          minIntervalMs: 500,
          scopeType: "project",
          scopeId: "p1",
          eventType: "test.updated",
          entityType: "test",
          entityId: "t1",
          loader: () => Promise.reject(new Error("loader failed")),
          onPublished: vi.fn(),
        },
        deps
      );

      await result.task;

      expect(deps.metrics.increment).toHaveBeenCalledWith("test.updated", "failures");
      expect(deps.logger.error).toHaveBeenCalled();
    });

    it("logs payload size when requested", async () => {
      const deps = createDeps();
      const payload = { data: "hello" };
      const result = DashboardRealtimePublishScheduler.buildPublishTask(
        {
          now: 1000,
          lastPublishedAt: 0,
          minIntervalMs: 500,
          scopeType: "project",
          scopeId: "p1",
          eventType: "test.updated",
          entityType: "test",
          entityId: "t1",
          loader: () => payload,
          logPayloadSize: true,
          logType: "realtime_snapshot_published",
          onPublished: vi.fn(),
        },
        deps
      );

      await result.task;

      expect(deps.logger.info).toHaveBeenCalledWith(
        "realtime_snapshot_published",
        expect.objectContaining({ sizeBytes: expect.any(Number) })
      );
    });
  });

  describe("BoundedFingerprintCache", () => {
    it("reuses fingerprints for unchanged payloads", async () => {
      const { BoundedFingerprintCache } = await import("../../../src/services/dashboard-realtime-publish-scheduler.js");
      const cache = new BoundedFingerprintCache(3);
      cache.set("k1", "v1");
      expect(cache.get("k1")).toBe("v1");
    });

    it("evicts stale keys deterministically when capacity is exceeded", async () => {
      const { BoundedFingerprintCache } = await import("../../../src/services/dashboard-realtime-publish-scheduler.js");
      const cache = new BoundedFingerprintCache(2);
      cache.set("k1", "v1");
      cache.set("k2", "v2");
      cache.set("k3", "v3");

      expect(cache.get("k1")).toBeUndefined(); // Evicted
      expect(cache.get("k2")).toBe("v2");
      expect(cache.get("k3")).toBe("v3");
      expect(cache.size).toBe(2);
    });

    it("preserves active hot keys during eviction", async () => {
      const { BoundedFingerprintCache } = await import("../../../src/services/dashboard-realtime-publish-scheduler.js");
      const cache = new BoundedFingerprintCache(2);
      cache.set("k1", "v1");
      cache.set("k2", "v2");

      // Access k1 to make it newest
      expect(cache.get("k1")).toBe("v1");

      // Push k3, evicting k2 instead of k1
      cache.set("k3", "v3");

      expect(cache.get("k2")).toBeUndefined(); // Evicted
      expect(cache.get("k1")).toBe("v1");
      expect(cache.get("k3")).toBe("v3");
    });
  });
});
