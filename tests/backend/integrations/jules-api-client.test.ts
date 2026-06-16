import { describe, expect, it, vi } from "vitest";
import { JulesApiClient } from "../../../src/integrations/jules-api-client.js";
import axios from "axios";

const mockInstance = Object.assign(
  vi.fn(),
  {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((cb) => {
          (mockInstance.interceptors.request as any)._cb = cb;
        }),
      },
      response: {
        use: vi.fn((successCb, errorCb) => {
          (mockInstance.interceptors.response as any)._successCb = successCb;
          (mockInstance.interceptors.response as any)._errorCb = errorCb;
        }),
      }
    }
  }
);

vi.mock("axios", () => {
  return {
    default: {
      create: vi.fn(() => mockInstance),
    }
  };
});

describe("JulesApiClient coverage", () => {
    it("handles listAllSources pagination", async () => {
        vi.mocked(mockInstance.get)
            .mockResolvedValueOnce({ data: { sources: [{ id: "1" }], nextPageToken: "token" } })
            .mockResolvedValueOnce({ data: { sources: [{ id: "2" }] } });

        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key" });
        const res = await client.listAllSources();
        expect(res).toHaveLength(2);
    });

    it("handles listAllActivities pagination", async () => {
        vi.mocked(mockInstance.get)
            .mockResolvedValueOnce({ data: { activities: [{ id: "1" }], nextPageToken: "token" } })
            .mockResolvedValueOnce({ data: { activities: [{ id: "2" }] } });

        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key" });
        const res = await client.listAllActivities("sess");
        expect(res).toHaveLength(2);
    });

    it("hasApiKey and setApiKey normalize", () => {
        const client = new JulesApiClient({ baseUrl: "http://url" });
        expect(client.hasApiKey()).toBe(false);
        client.setApiKey("  ");
        expect(client.hasApiKey()).toBe(false);
        client.setApiKey("key");
        expect(client.hasApiKey()).toBe(true);
    });

    it("extractSessionId handling", () => {
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key" });
        expect(client.extractSessionId({})).toBeUndefined();
        expect(client.extractSessionId({ name: "sessions/1" })).toBe("1");
        expect(client.extractSessionId({ id: "sessions/1" })).toBe("1");
        expect(client.extractSessionId({ name: "" })).toBeUndefined();
        expect(client.extractSessionId({ id: "" })).toBeUndefined();
    });

    it("resolveSessionName handling", () => {
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key" });
        expect(client.resolveSessionName({})).toBeUndefined();
        expect(client.resolveSessionName({ name: "" })).toBeUndefined();
        expect(client.resolveSessionName({ id: "" })).toBeUndefined();
        expect(client.resolveSessionName({ id: "1" })).toBe("sessions/1");
        expect(client.resolveSessionName({ name: "sessions/2" })).toBe("sessions/2");
    });

    it("interceptor adds api key if present", async () => {
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key" });
        const cb = (mockInstance.interceptors.request as any)._cb;
        const config = await cb({ headers: {} });
        expect(config.headers["X-Goog-Api-Key"]).toBe("key");
    });

    it("interceptor removes api key if absent", async () => {
        const client = new JulesApiClient({ baseUrl: "http://url" });
        const cb = (mockInstance.interceptors.request as any)._cb;
        const config = await cb({ headers: { "X-Goog-Api-Key": "test" } });
        expect(config.headers["X-Goog-Api-Key"]).toBeUndefined();
    });

    it("interceptor retries on 429", async () => {
        vi.useFakeTimers();
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key" });
        const errorCb = (mockInstance.interceptors.response as any)._errorCb;
        
        mockInstance.mockResolvedValue({ data: "success" });

        const mockError = {
          config: { url: "http://url/test" },
          response: { status: 429 }
        };

        const promise = errorCb(mockError);
        
        await vi.runAllTimersAsync();
        
        const result = await promise;
        expect(result.data).toBe("success");
        expect(mockInstance).toHaveBeenCalledWith(mockError.config);

        vi.useRealTimers();
    });

    it("interceptor honors Retry-After on 429", async () => {
        vi.useFakeTimers();
        const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key" });
        const errorCb = (mockInstance.interceptors.response as any)._errorCb;

        mockInstance.mockResolvedValue({ data: "ok" });
        const mockError = {
          config: { url: "http://url/test" },
          response: { status: 429, headers: { "retry-after": "3" } },
        };

        const promise = errorCb(mockError);
        await vi.runAllTimersAsync();
        await promise;

        // 3s Retry-After should dominate the 1s first-attempt backoff.
        expect(setTimeoutSpy.mock.calls.some(([, ms]) => ms === 3000)).toBe(true);
        setTimeoutSpy.mockRestore();
        vi.useRealTimers();
    });

    it("throttles request starts by the minimum interval", async () => {
        vi.useFakeTimers();
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 200 });
        const cb = (mockInstance.interceptors.request as any)._cb;

        await cb({ headers: {} });

        let resolved = false;
        const second = cb({ headers: {} }).then(() => { resolved = true; });
        await Promise.resolve();
        expect(resolved).toBe(false);

        await vi.advanceTimersByTimeAsync(200);
        await second;
        expect(resolved).toBe(true);

        vi.useRealTimers();
    });

    it("fetchRecentActivitiesLite returns recent activities without per-activity hydration", async () => {
        vi.mocked(mockInstance.get).mockReset();
        vi.mocked(mockInstance.get)
            .mockResolvedValueOnce({ data: { activities: [{ id: "a1", createTime: "2026-01-02T00:00:00Z", agentMessaged: { agentMessage: "second" } }], nextPageToken: "t" } })
            .mockResolvedValueOnce({ data: { activities: [{ id: "a0", createTime: "2026-01-01T00:00:00Z", agentMessaged: { agentMessage: "first" } }] } });

        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 0 });
        const res = await client.fetchRecentActivitiesLite("sessions/x", 5);

        // Sorted ascending by createTime, and only the two list calls (no getActivity hydration).
        expect(res.map((a) => a.id)).toEqual(["a0", "a1"]);
        expect(mockInstance.get).toHaveBeenCalledTimes(2);
    });
});
