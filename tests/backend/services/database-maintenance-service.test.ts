import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DatabaseMaintenanceService } from "../../../src/services/database-maintenance-service.js";

describe("DatabaseMaintenanceService", () => {
  let deps: any;

  beforeEach(() => {
    vi.useFakeTimers();

    const mockAppDbExec = vi.fn();
    const mockAppDbPrepare = vi.fn(() => ({ run: vi.fn(() => ({ changes: 0 })) }));
    const mockSessionDbExec = vi.fn();
    const mockSessionDbPrepare = vi.fn(() => ({ run: vi.fn(() => ({ changes: 0 })) }));
    const mockSettingsDbExec = vi.fn();

    deps = {
      appDbStorage: {
        getDatabase: vi.fn(() => ({
          exec: mockAppDbExec,
          prepare: mockAppDbPrepare,
        })),
      },
      sessionTracking: {
        getDatabase: vi.fn(() => ({
          exec: mockSessionDbExec,
          prepare: mockSessionDbPrepare,
        })),
      },
      settingsRepository: {
        getSystemSettings: vi.fn(() => ({
          runtime: {
            dbAutoVacuumOnStartup: true,
            dbPruningEnabled: true,
            dbRetentionDays: 14,
          },
        })),
        getDatabase: vi.fn(() => ({
          exec: mockSettingsDbExec,
        })),
      },
      logger: {
        info: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      },
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("runs asynchronously via setImmediate and does not block", () => {
    const service = new DatabaseMaintenanceService(deps);
    service.runMaintenance();

    expect(deps.settingsRepository.getSystemSettings).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(deps.settingsRepository.getSystemSettings).toHaveBeenCalled();
  });

  it("prevents overlapping concurrent executions using a guard flag", () => {
    const service = new DatabaseMaintenanceService(deps);

    service.runMaintenance();
    service.runMaintenance(); // Second call should be skipped

    expect(deps.logger.debug).toHaveBeenCalledWith("Database maintenance is already running, skipping overlapping execution.");

    vi.runAllTimers();

    expect(deps.settingsRepository.getSystemSettings).toHaveBeenCalledTimes(1);
  });

  it("respects dbRetentionDays from system settings and converts it to ms correctly", () => {
    deps.settingsRepository.getSystemSettings.mockReturnValue({
      runtime: {
        dbAutoVacuumOnStartup: false,
        dbPruningEnabled: true,
        dbRetentionDays: 5,
      },
    });

    const mockRun = vi.fn(() => ({ changes: 0 }));
    deps.appDbStorage.getDatabase().prepare.mockReturnValue({ run: mockRun });
    deps.sessionTracking.getDatabase().prepare.mockReturnValue({ run: mockRun });

    const service = new DatabaseMaintenanceService(deps);

    const now = Date.now();
    vi.setSystemTime(now);

    service.runMaintenance();
    vi.runAllTimers();

    // 5 days in ms
    const expectedThresholdMs = now - (5 * 24 * 60 * 60 * 1000);
    const expectedThresholdDate = new Date(expectedThresholdMs).toISOString();

    expect(deps.logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("Pruning completed/failed task runs older than 5 days..."),
      expect.objectContaining({ thresholdDate: expectedThresholdDate })
    );
  });

  it("only calls VACUUM if pruning deleted rows", () => {
    // 1. Pruning enabled but deletes 0 rows
    const mockAppDbExec = vi.fn();
    const mockSessionDbExec = vi.fn();
    const mockSettingsDbExec = vi.fn();

    deps.appDbStorage.getDatabase.mockReturnValue({
      exec: mockAppDbExec,
      prepare: vi.fn(() => ({ run: vi.fn(() => ({ changes: 0 })) }))
    });
    deps.sessionTracking.getDatabase.mockReturnValue({
      exec: mockSessionDbExec,
      prepare: vi.fn(() => ({ run: vi.fn(() => ({ changes: 0 })) }))
    });
    deps.settingsRepository.getDatabase.mockReturnValue({ exec: mockSettingsDbExec });

    const service1 = new DatabaseMaintenanceService(deps);
    service1.runMaintenance();
    vi.runAllTimers();

    expect(mockAppDbExec).not.toHaveBeenCalled();
    expect(deps.logger.debug).toHaveBeenCalledWith("Skipping VACUUM because pruning did not delete any rows.");

    // 2. Pruning enabled and deletes rows
    vi.clearAllMocks();
    deps.settingsRepository.getSystemSettings.mockReturnValue({
        runtime: {
          dbAutoVacuumOnStartup: true,
          dbPruningEnabled: true,
          dbRetentionDays: 14,
        },
    });

    deps.appDbStorage.getDatabase.mockReturnValue({
      exec: mockAppDbExec,
      prepare: vi.fn(() => ({ run: vi.fn(() => ({ changes: 1 })) })) // Returning changes > 0
    });

    const service2 = new DatabaseMaintenanceService(deps);
    service2.runMaintenance();
    vi.runAllTimers();

    expect(mockAppDbExec).toHaveBeenCalledWith("VACUUM;");
  });

  it("catches and logs errors without throwing if pruning or vacuuming fails", () => {
    const errorMsg = "Database error during pruning";
    deps.appDbStorage.getDatabase().prepare.mockImplementation(() => {
      throw new Error(errorMsg);
    });

    deps.settingsRepository.getSystemSettings.mockReturnValue({
      runtime: {
        dbAutoVacuumOnStartup: true,
        dbPruningEnabled: true,
        dbRetentionDays: 14,
      },
    });

    const service = new DatabaseMaintenanceService(deps);

    expect(() => {
      service.runMaintenance();
      vi.runAllTimers();
    }).not.toThrow();

    expect(deps.logger.error).toHaveBeenCalledWith("Failed to prune database records", {
      error: errorMsg,
    });
    // Should still finish cleanly and reset isRunning flag
    expect(deps.logger.info).toHaveBeenCalledWith("Database maintenance completed successfully.");

    // Test vacuum error
    vi.clearAllMocks();

    deps.settingsRepository.getSystemSettings.mockReturnValue({
        runtime: {
          dbAutoVacuumOnStartup: true,
          dbPruningEnabled: true,
          dbRetentionDays: 14,
        },
    });
    deps.appDbStorage.getDatabase.mockReturnValue({
      exec: vi.fn(() => { throw new Error("Vacuum failed") }),
      prepare: vi.fn(() => ({ run: vi.fn(() => ({ changes: 1 })) }))
    });

    const service2 = new DatabaseMaintenanceService(deps);
    expect(() => {
        service2.runMaintenance();
        vi.runAllTimers();
    }).not.toThrow();
    expect(deps.logger.error).toHaveBeenCalledWith("Failed to vacuum databases", {
        error: "Vacuum failed",
    });

    expect(deps.logger.info).toHaveBeenCalledWith("Database maintenance completed successfully.");
  });
});
