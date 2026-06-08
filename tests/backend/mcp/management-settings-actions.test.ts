import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SettingsActions } from "../../../src/mcp/management/settings-actions.js";
import type { SettingsRepository } from "../../../src/repositories/settings-repository.js";

describe("SettingsActions", () => {
  let settingsRepository: unknown;
  let actions: SettingsActions;

  beforeEach(() => {
    settingsRepository = {
      getSystemSettings: vi.fn().mockReturnValue({ defaults: { automationLevel: "FULL" } }),
      getProjectSettings: vi.fn().mockReturnValue({ automationLevel: "SEMI_AUTO" }),
      resolveProjectDashboardSettings: vi.fn().mockReturnValue({ settings: { level: "resolved_project" } }),
      getSprintSettings: vi.fn().mockReturnValue({ automationLevel: "MANUAL" }),
      resolveSprintDashboardSettings: vi.fn().mockReturnValue({ settings: { level: "resolved_sprint" } }),
      saveSystemSettings: vi.fn().mockImplementation((val) => val),
      saveProjectSettings: vi.fn().mockImplementation((id, val) => val),
      resetProjectSettings: vi.fn(),
      saveSprintSettings: vi.fn().mockImplementation((id, base, val) => val),
      resetSprintSettings: vi.fn(),
      getProjectResolvedSettings: vi.fn().mockReturnValue({}),
    };

    actions = new SettingsActions(settingsRepository as unknown as SettingsRepository);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("handles getting system settings", async () => {
    const res = await actions.handleSettingsAction({ domain: "settings", action: "get_system", payload: {} });
    expect(res.result).toEqual({ settings: { defaults: { automationLevel: "FULL" } } });
  });

  it("requires human approval before patching system settings", async () => {
    const res = await actions.handleSettingsAction({
      domain: "settings",
      action: "patch_system_setting",
      payload: { path: "defaults.automationLevel", value: "SEMI_AUTO" },
    });
    expect(res.approvalRequired).toBe(true);
    expect(res.approvalMessage).toContain("DO NOT call this settings endpoint again");
    expect(settingsRepository.saveSystemSettings).not.toHaveBeenCalled();
  });

  it("does not let approval.confirmed bypass the first settings mutation call", async () => {
    const res = await actions.handleSettingsAction({
      domain: "settings",
      action: "patch_system_setting",
      payload: { path: "defaults.automationLevel", value: "SEMI_AUTO" },
      approval: { confirmed: true },
    });
    expect(res.approvalRequired).toBe(true);
    expect(settingsRepository.saveSystemSettings).not.toHaveBeenCalled();
  });

  it("executes a settings patch only after the same payload is confirmed", async () => {
    const payload = { path: "defaults.automationLevel", value: "SEMI_AUTO" };

    await actions.handleSettingsAction({
      domain: "settings",
      action: "patch_system_setting",
      payload,
    });
    const res = await actions.handleSettingsAction({
      domain: "settings",
      action: "patch_system_setting",
      payload,
      approval: { confirmed: true },
    });

    expect(res.result).toEqual({ settings: { defaults: { automationLevel: "SEMI_AUTO" } } });
    expect(settingsRepository.saveSystemSettings).toHaveBeenCalledTimes(1);
  });

  it("does not reuse a settings approval for a different payload", async () => {
    await actions.handleSettingsAction({
      domain: "settings",
      action: "patch_system_setting",
      payload: { path: "defaults.automationLevel", value: "SEMI_AUTO" },
    });
    const res = await actions.handleSettingsAction({
      domain: "settings",
      action: "patch_system_setting",
      payload: { path: "defaults.automationLevel", value: "MANUAL" },
      approval: { confirmed: true },
    });

    expect(res.approvalRequired).toBe(true);
    expect(settingsRepository.saveSystemSettings).not.toHaveBeenCalled();
  });

  it("expires pending settings approvals after 15 minutes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-08T10:00:00Z"));
    const payload = { path: "defaults.automationLevel", value: "SEMI_AUTO" };

    await actions.handleSettingsAction({
      domain: "settings",
      action: "patch_system_setting",
      payload,
    });

    vi.setSystemTime(new Date("2026-06-08T10:16:00Z"));

    const res = await actions.handleSettingsAction({
      domain: "settings",
      action: "patch_system_setting",
      payload,
      approval: { confirmed: true },
    });

    expect(res.approvalRequired).toBe(true);
    expect(settingsRepository.saveSystemSettings).not.toHaveBeenCalled();
  });

  it("rejects settings patches without a value", async () => {
    await expect(actions.handleSettingsAction({
      domain: "settings",
      action: "patch_system_setting",
      payload: { path: "defaults.automationLevel" },
    })).rejects.toThrow("value is required");
    expect(settingsRepository.saveSystemSettings).not.toHaveBeenCalled();
  });

  it("requires approval for replacing system settings", async () => {
    const res = await actions.handleSettingsAction({
      domain: "settings",
      action: "replace_system_settings",
      payload: { settings: {} },
    });
    expect(res.approvalRequired).toBe(true);
    expect(settingsRepository.saveSystemSettings).not.toHaveBeenCalled();
  });

  it("allows replacing system settings with explicit approval after a pending request exists", async () => {
    const payload = { settings: { defaults: { automationLevel: "MANUAL" } } };
    await actions.handleSettingsAction({
      domain: "settings",
      action: "replace_system_settings",
      payload,
    });
    const res = await actions.handleSettingsAction({
      domain: "settings",
      action: "replace_system_settings",
      payload,
      approval: { confirmed: true },
    });
    expect(res.result).toEqual({ settings: { defaults: { automationLevel: "MANUAL" } } });
    expect(settingsRepository.saveSystemSettings).toHaveBeenCalled();
  });

  it("patches project settings after confirmation", async () => {
    const payload = { projectId: "proj-1", path: "automationLevel", value: "AGENT" };
    await actions.handleSettingsAction({
      domain: "settings",
      action: "patch_project_setting",
      payload,
    });
    const res = await actions.handleSettingsAction({
      domain: "settings",
      action: "patch_project_setting",
      payload,
      approval: { confirmed: true },
    });
    expect(res.result).toEqual({ settings: { automationLevel: "AGENT" } });
    expect(settingsRepository.saveProjectSettings).toHaveBeenCalledWith("proj-1", { automationLevel: "AGENT" });
  });

  it("requires approval for resetting project settings", async () => {
    const res = await actions.handleSettingsAction({
      domain: "settings",
      action: "reset_project_settings",
      payload: { projectId: "proj-1" },
    });
    expect(res.approvalRequired).toBe(true);
    expect(settingsRepository.resetProjectSettings).not.toHaveBeenCalled();
  });
});
