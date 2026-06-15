import type { Logger } from "../shared/logging/logger.js";
import type { AppDbStorage } from "../repositories/app-db-storage.js";
import type { SessionTrackingRepository } from "../repositories/session-tracking-repository.js";
import type { SettingsRepository } from "../repositories/settings-repository.js";

export interface DatabaseMaintenanceServiceDeps {
  appDbStorage: AppDbStorage;
  sessionTracking: SessionTrackingRepository;
  settingsRepository: SettingsRepository;
  logger: Logger;
}

export class DatabaseMaintenanceService {
  private isRunning = false;

  constructor(private readonly deps: DatabaseMaintenanceServiceDeps) {}

  /**
   * Executes the pruning and vacuuming routines according to the system configuration.
   * Runs asynchronously via setImmediate to avoid blocking the startup flow.
   */
  runMaintenance(): void {
    if (this.isRunning) {
      this.deps.logger.debug("Database maintenance is already running, skipping overlapping execution.");
      return;
    }

    this.isRunning = true;

    setImmediate(() => {
      try {
        const settings = this.deps.settingsRepository.getSystemSettings();
        const runtime = settings.runtime;

        const autoVacuum = runtime.dbAutoVacuumOnStartup ?? true;
        const pruningEnabled = runtime.dbPruningEnabled ?? true;
        const retentionDays = runtime.dbRetentionDays ?? 14;

        this.deps.logger.info("Starting database maintenance...", {
          autoVacuum,
          pruningEnabled,
          retentionDays,
        });

        let deletedRows = false;
        if (pruningEnabled) {
          try {
            deletedRows = this.pruneData(retentionDays);
          } catch (error) {
            this.deps.logger.error("Failed to prune database records", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (autoVacuum) {
          if (!pruningEnabled || deletedRows) {
            try {
              this.vacuumDatabases();
            } catch (error) {
              this.deps.logger.error("Failed to vacuum databases", {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          } else {
             this.deps.logger.debug("Skipping VACUUM because pruning did not delete any rows.");
          }
        }

        this.deps.logger.info("Database maintenance completed successfully.");
      } catch (error) {
        this.deps.logger.error("Unexpected error during database maintenance", {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        this.isRunning = false;
      }
    });
  }

  private pruneData(retentionDays: number): boolean {
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    const thresholdDate = new Date(Date.now() - retentionMs).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const appDb = this.deps.appDbStorage.getDatabase();
    const sessionDb = this.deps.sessionTracking.getDatabase();

    // 1. Prune app.db completed/failed task runs
    this.deps.logger.debug(`Pruning completed/failed task runs older than ${retentionDays} days...`, { thresholdDate });
    const runPruned = appDb.prepare(`
      DELETE FROM task_runs
      WHERE finished_at IS NOT NULL AND finished_at < ?
    `).run(thresholdDate);

    // 2. Prune app.db resolved attention items
    this.deps.logger.debug(`Pruning resolved attention items older than ${retentionDays} days...`, { thresholdDate });
    const attentionPruned = appDb.prepare(`
      DELETE FROM project_attention_items
      WHERE resolved_at IS NOT NULL AND resolved_at < ?
    `).run(thresholdDate);

    // 3. Prune app.db stale realtime events (older than 1 day)
    this.deps.logger.debug("Pruning stale dashboard realtime events...", { oneDayAgo });
    const eventsPruned = appDb.prepare(`
      DELETE FROM dashboard_realtime_events
      WHERE created_at < ?
    `).run(oneDayAgo);

    // 4. Prune session-tracking.db completed/failed sessions and their activities
    this.deps.logger.debug(`Pruning provider sessions and activities older than ${retentionDays} days...`, { thresholdDate });
    
    // First, delete activities belonging to the old sessions
    const activitiesPruned = sessionDb.prepare(`
      DELETE FROM provider_activities
      WHERE session_id IN (
        SELECT id FROM provider_sessions
        WHERE update_time < ? AND state != 'RUNNING'
      )
    `).run(thresholdDate);

    const sessionsPruned = sessionDb.prepare(`
      DELETE FROM provider_sessions
      WHERE update_time < ? AND state != 'RUNNING'
    `).run(thresholdDate);

    this.deps.logger.info("Pruned old database records successfully", {
      taskRunsDeleted: runPruned.changes,
      attentionItemsDeleted: attentionPruned.changes,
      realtimeEventsDeleted: eventsPruned.changes,
      providerActivitiesDeleted: activitiesPruned.changes,
      providerSessionsDeleted: sessionsPruned.changes,
    });

    return (
      runPruned.changes > 0 ||
      attentionPruned.changes > 0 ||
      eventsPruned.changes > 0 ||
      activitiesPruned.changes > 0 ||
      sessionsPruned.changes > 0
    );
  }

  private vacuumDatabases(): void {
    this.deps.logger.info("Executing VACUUM on app.db...");
    this.deps.appDbStorage.getDatabase().exec("VACUUM;");

    this.deps.logger.info("Executing VACUUM on session-tracking.db...");
    this.deps.sessionTracking.getDatabase().exec("VACUUM;");

    this.deps.logger.info("Executing VACUUM on settings.db...");
    this.deps.settingsRepository.getDatabase().exec("VACUUM;");
  }
}
