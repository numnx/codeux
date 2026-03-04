import { describe, it, expect, vi, beforeEach } from "vitest";
import { JulesAgentServer } from "../../../src/server/jules-agent-server.js";
import { loadAppConfig } from "../../../src/config/app-config.js";
import path from "path";
import { DEFAULT_DASHBOARD_SETTINGS } from "../../../src/repositories/settings-defaults.js";

describe("JulesAgentServer", () => {
  let server: JulesAgentServer;
  const projectRoot = path.resolve(process.cwd());
  const appConfig = loadAppConfig([], projectRoot);

  beforeEach(() => {
    server = new JulesAgentServer({ projectRoot, appConfig });
  });

  it("should be defined", () => {
    expect(server).toBeDefined();
  });

  it("should provide a correct context", () => {
    const context = (server as any).createContext();
    expect(context.getProjectRoot()).toBe(projectRoot);
    expect(context.getAppConfig()).toEqual(appConfig);
    expect(context.runtimeContext).toBeDefined();
  });

  describe("getEffectiveJulesApiKey", () => {
    it("should return the key from dashboard settings if available", () => {
      const runtimeContext = (server as any).runtimeContext;
      runtimeContext.dashboardSettings = {
        ...DEFAULT_DASHBOARD_SETTINGS,
        aiProvider: {
          providers: {
            jules: { apiKey: "dashboard-key", model: "model", thinkingMode: false }
          }
        }
      };
      expect((server as any).getEffectiveJulesApiKey()).toBe("dashboard-key");
    });

    it("should fallback to environment variable if dashboard settings are missing", () => {
      const originalKey = process.env.JULES_API_KEY;
      process.env.JULES_API_KEY = "env-key";
      try {
        const runtimeContext = (server as any).runtimeContext;
        runtimeContext.dashboardSettings = null;
        expect((server as any).getEffectiveJulesApiKey()).toBe("env-key");
      } finally {
        process.env.JULES_API_KEY = originalKey;
      }
    });
  });

  describe("getDashboardPort", () => {
    it("should return port from dashboard settings", () => {
      const runtimeContext = (server as any).runtimeContext;
      runtimeContext.dashboardSettings = {
        ...DEFAULT_DASHBOARD_SETTINGS,
        dashboardPort: 9999
      };
      expect((server as any).getDashboardPort()).toBe(9999);
    });

    it("should fallback to runtime settings port", () => {
      const runtimeContext = (server as any).runtimeContext;
      runtimeContext.dashboardSettings = { ...DEFAULT_DASHBOARD_SETTINGS, dashboardPort: undefined };
      runtimeContext.settings = { dashboardPort: 8888 };
      expect((server as any).getDashboardPort()).toBe(8888);
    });
  });

  describe("isActionRequiredState", () => {
    it("should return true for action required states", () => {
      expect((server as any).isActionRequiredState("AWAITING_PLAN_APPROVAL")).toBe(true);
      expect((server as any).isActionRequiredState("AWAITING_USER_FEEDBACK")).toBe(true);
      expect((server as any).isActionRequiredState("PAUSED")).toBe(true);
    });

    it("should return false for other states", () => {
      expect((server as any).isActionRequiredState("RUNNING")).toBe(false);
      expect((server as any).isActionRequiredState("COMPLETED")).toBe(false);
      expect((server as any).isActionRequiredState(undefined)).toBe(false);
    });
  });

  describe("normalizeName", () => {
    it("should call julesApi.normalizeName", () => {
      const spy = vi.spyOn((server as any).julesApi, "normalizeName").mockReturnValue("normalized");
      expect((server as any).normalizeName("type", "id")).toBe("normalized");
      expect(spy).toHaveBeenCalledWith("type", "id");
    });
  });

  describe("getEffectiveGithubToken", () => {
    it("should return token from dashboard settings", () => {
      const runtimeContext = (server as any).runtimeContext;
      runtimeContext.dashboardSettings = {
        ...DEFAULT_DASHBOARD_SETTINGS,
        git: { ...DEFAULT_DASHBOARD_SETTINGS.git, githubToken: "dash-token" }
      };
      expect((server as any).getEffectiveGithubToken()).toBe("dash-token");
    });

    it("should fallback to environment variable", () => {
      const originalToken = process.env.GITHUB_TOKEN;
      process.env.GITHUB_TOKEN = "env-token";
      try {
        const runtimeContext = (server as any).runtimeContext;
        runtimeContext.dashboardSettings = null;
        expect((server as any).getEffectiveGithubToken()).toBe("env-token");
      } finally {
        process.env.GITHUB_TOKEN = originalToken;
      }
    });
  });

  describe("resolveGitTrackingRequest", () => {
    it("should return FEATURE_PR_CI when there are running tasks and a feature branch", () => {
      const runtimeContext = (server as any).runtimeContext;
      runtimeContext.dashboardSettings = {
        ...DEFAULT_DASHBOARD_SETTINGS,
        ciIntelligence: { ...DEFAULT_DASHBOARD_SETTINGS.ciIntelligence, enabled: true, waitForCiBeforeFeatureMerge: true }
      };
      runtimeContext.lastStatus = {
        subtasks: [{ id: "T1", status: "RUNNING" } as any],
        feature_branch: "feat/test"
      };
      const request = (server as any).resolveGitTrackingRequest();
      expect(request.scope).toBe("FEATURE_PR_CI");
      expect(request.featureBranch).toBe("feat/test");
    });

    it("should return MAIN_BRANCH_CI otherwise", () => {
      const runtimeContext = (server as any).runtimeContext;
      runtimeContext.lastStatus = { subtasks: [], feature_branch: null };
      const request = (server as any).resolveGitTrackingRequest();
      expect(request.scope).toBe("MAIN_BRANCH_CI");
    });
  });

  describe("resolveGitStatusRepoPath", () => {
    it("should return repo_path from lastStatus if available", () => {
      const runtimeContext = (server as any).runtimeContext;
      runtimeContext.lastStatus = { repo_path: "/custom/path" };
      expect((server as any).resolveGitStatusRepoPath()).toBe("/custom/path");
    });

    it("should fallback to projectRoot", () => {
      const runtimeContext = (server as any).runtimeContext;
      runtimeContext.lastStatus = null;
      expect((server as any).resolveGitStatusRepoPath()).toBe(projectRoot);
    });
  });

  describe("resolveSessionNameFromTask", () => {
    it("should resolve from session_name", () => {
      const task = { id: "T1", session_name: "sessions/abc" } as any;
      const spy = vi.spyOn((server as any).julesApi, "resolveSessionName").mockReturnValue("resolved-name");
      expect((server as any).resolveSessionNameFromTask(task)).toBe("resolved-name");
      expect(spy).toHaveBeenCalledWith({ name: "sessions/abc" });
    });

    it("should resolve from session_id", () => {
      const task = { id: "T1", session_id: "abc" } as any;
      const spy = vi.spyOn((server as any).julesApi, "resolveSessionName").mockReturnValue("resolved-id");
      expect((server as any).resolveSessionNameFromTask(task)).toBe("resolved-id");
      expect(spy).toHaveBeenCalledWith({ id: "abc" });
    });
  });

  describe("formatError", () => {
    it("should format a standard error", () => {
      const error = new Error("something went wrong");
      const formatted = (server as any).formatError(error);
      expect(formatted.content[0].text).toBe("Error: something went wrong");
      expect(formatted.isError).toBe(true);
    });

    it("should format an axios error with response data", () => {
      const axiosError = {
        isAxiosError: true,
        message: "axios fail",
        response: { data: { error: { message: "api error" } } }
      } as any;
      // We need to mock axios.isAxiosError
      vi.mock("axios", async () => {
        const actual = await vi.importActual("axios") as any;
        return {
          ...actual,
          default: {
            ...actual.default,
            isAxiosError: (e: any) => e?.isAxiosError === true
          },
          isAxiosError: (e: any) => e?.isAxiosError === true
        };
      });

      const formatted = (server as any).formatError(axiosError);
      expect(formatted.content[0].text).toBe("Error: api error");
    });
  });

  describe("persistTaskMergedFlag", () => {
    it("should call subtaskRepository.setMerged", async () => {
      const spy = vi.spyOn((server as any).subtaskRepository, "setMerged").mockResolvedValue(undefined);
      await (server as any).persistTaskMergedFlag({ repoPath: "/repo", sprintNumber: 1, taskId: "T1", merged: true });
      expect(spy).toHaveBeenCalledWith(path.join("/repo", ".jules-subagents", "sprints", "sprint1-subtasks"), "T1", true);
    });
  });
});
