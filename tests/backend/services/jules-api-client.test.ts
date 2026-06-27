import { describe, it, expect, vi, beforeEach } from "vitest";
import { JulesApiClient } from "../../../src/integrations/jules-api-client.js";
import axios from "axios";

const mockAxiosInstance = {
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  get: vi.fn(),
  post: vi.fn(),
  request: vi.fn(),
};

vi.mock("axios", () => {
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

describe("JulesApiClient", () => {
  let client: JulesApiClient;
  const baseUrl = "https://api.jules.ai";
  const apiKey = "test-key";

  beforeEach(() => {
    vi.clearAllMocks();
    client = new JulesApiClient({ baseUrl, apiKey });
  });

  it("should have api key", () => {
    expect(client.hasApiKey()).toBe(true);
  });

  it("should normalize name", () => {
    expect(client.normalizeName("sources", "s1")).toBe("sources/s1");
    expect(client.normalizeName("sources", "sources/s1")).toBe("sources/s1");
  });

  it("should extract session id", () => {
    expect(client.extractSessionId({ id: "sessions/s1" })).toBe("s1");
    expect(client.extractSessionId({ name: "sessions/s2" })).toBe("s2");
  });

  describe("API calls", () => {
    const mockAxios = () => (client as any).axiosInstance;

    it("gets source", async () => {
      vi.mocked(mockAxios().request).mockResolvedValue({ data: { id: "s1" } });
      const res = await client.getSource("s1");
      expect(res.id).toBe("s1");
      expect(mockAxios().request).toHaveBeenCalledWith(expect.objectContaining({ url: "/sources/s1", method: "GET" }));
    });

    it("lists sources", async () => {
      vi.mocked(mockAxios().request).mockResolvedValue({ data: { sources: [] } });
      await client.listSources({ filter: "f" });
      expect(mockAxios().request).toHaveBeenCalledWith(expect.objectContaining({ url: "/sources", method: "GET" }));
    });

    it("lists all sources", async () => {
      vi.mocked(mockAxios().request)
        .mockResolvedValueOnce({ data: { sources: [{ id: "1" }], nextPageToken: "next" } })
        .mockResolvedValueOnce({ data: { sources: [{ id: "2" }] } });
      const sources = await client.listAllSources();
      expect(sources).toHaveLength(2);
    });

    it("creates session", async () => {
      vi.mocked(mockAxios().request).mockResolvedValue({ data: { id: "s1" } });
      const res = await client.createSession({ prompt: "p", sourceContext: { source: "src" } });
      expect(res.id).toBe("s1");
    });

    it("gets session", async () => {
      vi.mocked(mockAxios().request).mockResolvedValue({ data: { id: "s1" } });
      await client.getSession("s1");
      expect(mockAxios().request).toHaveBeenCalledWith(expect.objectContaining({ url: "/sessions/s1", method: "GET" }));
    });

    it("approves plan", async () => {
      vi.mocked(mockAxios().request).mockResolvedValue({ data: { ok: true } });
      await client.approveSessionPlan("s1");
      expect(mockAxios().request).toHaveBeenCalledWith(expect.objectContaining({ url: "/sessions/s1:approvePlan", method: "POST" }));
    });

    it("sends message", async () => {
      vi.mocked(mockAxios().request).mockResolvedValue({ data: { ok: true } });
      await client.sendSessionMessage("s1", "hi");
      expect(mockAxios().request).toHaveBeenCalledWith(expect.objectContaining({ url: "/sessions/s1:sendMessage", data: { prompt: "hi" }, method: "POST" }));
    });

    it("gets activity", async () => {
      vi.mocked(mockAxios().request).mockResolvedValue({ data: { id: "a1" } });
      await client.getActivity("s1", "a1");
      expect(mockAxios().request).toHaveBeenCalledWith(expect.objectContaining({ url: "/sessions/s1/activities/a1", method: "GET" }));
    });

    it("lists all activities", async () => {
      vi.mocked(mockAxios().request)
        .mockResolvedValueOnce({ data: { activities: [{ id: "1" }], nextPageToken: "next" } })
        .mockResolvedValueOnce({ data: { activities: [{ id: "2" }] } });
      const activities = await client.listAllActivities("s1");
      expect(activities).toHaveLength(2);
    });

    it("fetches the latest activities across pages and hydrates them via get", async () => {
      vi.mocked(mockAxios().request)
        .mockResolvedValueOnce({
          data: {
            activities: [
              { id: "a1", createTime: "2021-01-01T00:00:00.000Z", progressUpdated: {} },
            ],
            nextPageToken: "next",
          },
        })
        .mockResolvedValueOnce({
          data: {
            activities: [
              { id: "a2", createTime: "2021-01-02T00:00:00.000Z", agentMessaged: { agentMessage: "Latest message" } },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: {
            id: "a2",
            createTime: "2021-01-02T00:00:00.000Z",
            agentMessaged: { agentMessage: "Latest message" },
          },
        });

      const activities = await client.fetchRecentActivities("s1", 1);

      expect(activities).toEqual([
        {
          id: "a2",
          createTime: "2021-01-02T00:00:00.000Z",
          agentMessaged: { agentMessage: "Latest message" },
        },
      ]);
      expect(mockAxios().request).toHaveBeenNthCalledWith(1, expect.objectContaining({ url: "/sessions/s1/activities", method: "GET", params: { pageSize: 1, pageToken: undefined } }));
      expect(mockAxios().request).toHaveBeenNthCalledWith(2, expect.objectContaining({ url: "/sessions/s1/activities", method: "GET", params: { pageSize: 1, pageToken: "next" } }));
      expect(mockAxios().request).toHaveBeenNthCalledWith(3, expect.objectContaining({ url: "/sessions/s1/activities/a2", method: "GET" }));
    });
  });
});
