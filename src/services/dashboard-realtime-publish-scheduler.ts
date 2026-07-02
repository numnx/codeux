import type { DashboardRealtimeScopeType } from "../contracts/app-types.js";

export interface DashboardRealtimePublishSchedulerOptions<T> {
  now: number;
  lastPublishedAt: number;
  minIntervalMs: number;
  scopeType: DashboardRealtimeScopeType;
  scopeId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  projectId?: string;
  loader: () => Promise<T> | T;
  cacheKey?: string;
  skipDuplicate?: boolean;
  sprintIdExtractor?: (payload: T) => string | undefined;
  logType?: "realtime_snapshot_published" | "realtime_background_refresh";
  logPayloadSize?: boolean;
  onPublished: (now: number) => void;
}

export interface DashboardRealtimePublishSchedulerDependencies {
  logger: {
    debug(message: string, context?: unknown): void;
    info(message: string, context?: unknown): void;
    warn(message: string, context?: unknown): void;
    error(message: string, context?: unknown): void;
  };
  metrics: {
    increment(eventType: string, metric: "coalesced" | "throttled" | "unchanged" | "published" | "failures"): void;
  };
  fingerprints: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  };
  publishRawEvent(input: {
    scopeType: DashboardRealtimeScopeType;
    scopeId: string;
    eventType: string;
    entityType: string;
    entityId: string;
    projectId?: string;
    sprintId?: string;
    payload: unknown;
    replayable: boolean;
  }): void;
}

export class BoundedFingerprintCache {
  private readonly map = new Map<string, string>();

  constructor(private readonly maxSize: number) {}

  get(key: string): string | undefined {
    if (!this.map.has(key)) {
      return undefined;
    }
    const value = this.map.get(key)!;
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: string): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);
    if (this.map.size > this.maxSize) {
      // Delete oldest entry (front of Map iteration)
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

export class DashboardRealtimePublishScheduler {
  static buildPublishTask<T>(
    options: DashboardRealtimePublishSchedulerOptions<T>,
    deps: DashboardRealtimePublishSchedulerDependencies
  ): { task: Promise<void> | null; waitMs: number } {
    const waitMs = this.getThrottleDelay(options.lastPublishedAt, options.minIntervalMs, options.now);
    if (waitMs > 0) {
      deps.metrics.increment(options.eventType, "throttled");
      return { task: null, waitMs };
    }
    const task = (async () => {
      try {
        const payload = await Promise.resolve(options.loader());
        let sprintId: string | undefined;
        if (options.sprintIdExtractor) {
          sprintId = options.sprintIdExtractor(payload);
        }

        let payloadSizeBytes: number | undefined;

        if (options.cacheKey && options.skipDuplicate) {
          const fingerprint = this.getFingerprint(payload);
          if (deps.fingerprints.get(options.cacheKey) === fingerprint) {
            deps.logger.debug("skipping_duplicate_realtime_snapshot", {
              type: options.eventType,
              ...(options.projectId ? { projectId: options.projectId } : {}),
            });
            deps.metrics.increment(options.eventType, "unchanged");
            options.onPublished(options.now);
            return;
          }
          deps.fingerprints.set(options.cacheKey, fingerprint);
          if (options.logPayloadSize) {
            payloadSizeBytes = Buffer.byteLength(fingerprint, "utf8");
          }
        } else if (options.logPayloadSize) {
          const fingerprint = this.getFingerprint(payload);
          payloadSizeBytes = Buffer.byteLength(fingerprint, "utf8");
        }

        deps.publishRawEvent({
          scopeType: options.scopeType,
          scopeId: options.scopeId,
          eventType: options.eventType,
          entityType: options.entityType,
          entityId: options.entityId,
          ...(options.projectId ? { projectId: options.projectId } : {}),
          ...(sprintId ? { sprintId } : {}),
          payload,
          replayable: false,
        });
        deps.metrics.increment(options.eventType, "published");

        if (options.logType) {
          if (options.logType === "realtime_snapshot_published") {
            deps.logger.info(options.logType, {
              type: options.eventType,
              ...(payloadSizeBytes !== undefined ? { sizeBytes: payloadSizeBytes } : {}),
              ...(options.projectId ? { projectId: options.projectId } : {}),
              publishFrequencyMs: options.lastPublishedAt > 0 ? options.now - options.lastPublishedAt : 0,
            });
          } else {
            deps.logger.info(options.logType, { type: options.entityId });
          }
        }

        options.onPublished(options.now);
      } catch (error) {
        deps.metrics.increment(options.eventType, "failures");
        deps.logger.error(`Failed to publish ${options.eventType.replace(/\./g, " ")} realtime snapshot`, {
          ...(options.projectId ? { projectId: options.projectId } : {}),
          error,
        });
      }
    })();

    return { task, waitMs: 0 };
  }

  static getThrottleDelay(lastPublishedAt: number, minIntervalMs: number, now: number): number {
    if (lastPublishedAt <= 0) {
      return 0;
    }
    return Math.max(0, minIntervalMs - (now - lastPublishedAt));
  }

  static getNextDelay(currentDelayMs: number | null, candidateDelayMs: number): number {
    if (currentDelayMs === null) {
      return candidateDelayMs;
    }
    return Math.min(currentDelayMs, candidateDelayMs);
  }

  static getFingerprint(payload: unknown): string {
    return JSON.stringify(payload, (key, value) => {
      if (key === "updatedAt" || key === "timestamp") {
        return undefined;
      }
      return value;
    });
  }
}
