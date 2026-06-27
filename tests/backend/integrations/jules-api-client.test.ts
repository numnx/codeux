import { describe, expect, it, vi } from "vitest";
import { JulesApiClient, JulesNotFoundError, JulesApiError } from "../../../src/integrations/jules-api-client.js";
import axios from "axios";

const mockInstance = Object.assign(
  vi.fn(),
  {
    request: vi.fn(),
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
      isAxiosError: vi.fn((err: any) => err && typeof err === "object" && (err.isAxiosError === true || err.response?.status !== undefined)),
    }
  };
});

describe("JulesApiClient coverage", () => {
    it("handles listAllSources pagination", async () => {
        vi.mocked(mockInstance.request)
            .mockResolvedValueOnce({ data: { sources: [{ id: "1" }], nextPageToken: "token" } })
            .mockResolvedValueOnce({ data: { sources: [{ id: "2" }] } });

        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key" });
        const res = await client.listAllSources();
        expect(res).toHaveLength(2);
    });

    it("handles listAllActivities pagination", async () => {
        vi.mocked(mockInstance.request)
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
        vi.mocked(mockInstance.request).mockReset();
        vi.mocked(mockInstance.request)
            .mockResolvedValueOnce({ data: { activities: [{ id: "a1", createTime: "2026-01-02T00:00:00Z", agentMessaged: { agentMessage: "second" } }], nextPageToken: "t" } })
            .mockResolvedValueOnce({ data: { activities: [{ id: "a0", createTime: "2026-01-01T00:00:00Z", agentMessaged: { agentMessage: "first" } }] } });

        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 0 });
        const res = await client.fetchRecentActivitiesLite("sessions/x", 5);

        // Sorted ascending by createTime, and only the two list calls (no getActivity hydration).
        expect(res.map((a) => a.id)).toEqual(["a0", "a1"]);
        expect(mockInstance.request).toHaveBeenCalledTimes(2);
    });

    it("getCachedSessions coalesces concurrent callers into a single fetch", async () => {
        vi.mocked(mockInstance.request).mockReset();
        let resolveGet: (v: unknown) => void = () => {};
        vi.mocked(mockInstance.request).mockReturnValueOnce(new Promise((r) => { resolveGet = r; }));

        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 0, now: () => 0 });
        const p1 = client.getCachedSessions();
        const p2 = client.getCachedSessions();
        resolveGet({ data: { sessions: [{ id: "1" }] } });
        const [r1, r2] = await Promise.all([p1, p2]);

        expect(mockInstance.request).toHaveBeenCalledTimes(1);
        expect(r1).toBe(r2);
        expect(r1.map((s) => s.id)).toEqual(["1"]);
    });

    it("getCachedSessions serves the cached snapshot within the TTL and re-fetches after expiry", async () => {
        vi.mocked(mockInstance.request).mockReset();
        vi.mocked(mockInstance.request)
            .mockResolvedValueOnce({ data: { sessions: [{ id: "1" }] } })
            .mockResolvedValueOnce({ data: { sessions: [{ id: "2" }] } });

        let t = 0;
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 0, sessionsCacheTtlMs: 1000, now: () => t });

        expect((await client.getCachedSessions()).map((s) => s.id)).toEqual(["1"]);
        t = 500; // within TTL -> cached
        expect((await client.getCachedSessions()).map((s) => s.id)).toEqual(["1"]);
        expect(mockInstance.request).toHaveBeenCalledTimes(1);
        t = 1500; // expired -> refetch
        expect((await client.getCachedSessions()).map((s) => s.id)).toEqual(["2"]);
        expect(mockInstance.request).toHaveBeenCalledTimes(2);
    });

    it("getCachedSessions paginates and stops at maxSnapshotSessions", async () => {
        vi.mocked(mockInstance.request).mockReset();
        vi.mocked(mockInstance.request)
            .mockResolvedValueOnce({ data: { sessions: [{ id: "1" }, { id: "2" }], nextPageToken: "t" } })
            .mockResolvedValueOnce({ data: { sessions: [{ id: "3" }] } });

        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 0, now: () => 0 });
        expect((await client.getCachedSessions()).map((s) => s.id)).toEqual(["1", "2", "3"]);
    });

    it("sendSessionMessage invalidates the session snapshot so the next read refetches", async () => {
        vi.mocked(mockInstance.request).mockReset();
        vi.mocked(mockInstance.request)
            .mockResolvedValueOnce({ data: { sessions: [{ id: "1" }] } })
            .mockResolvedValueOnce({ data: {} })
            .mockResolvedValueOnce({ data: { sessions: [{ id: "2" }] } });

        // Long TTL so a re-fetch can only happen via invalidation.
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 0, sessionsCacheTtlMs: 1_000_000, now: () => 0 });
        expect((await client.getCachedSessions()).map((s) => s.id)).toEqual(["1"]);
        await client.sendSessionMessage("s", "hello");
        expect((await client.getCachedSessions()).map((s) => s.id)).toEqual(["2"]);
        expect(mockInstance.request).toHaveBeenCalledTimes(3);
    });

    it("getCachedSessions serves the last good snapshot when a refresh fails", async () => {
        vi.mocked(mockInstance.request).mockReset();
        vi.mocked(mockInstance.request)
            .mockResolvedValueOnce({ data: { sessions: [{ id: "1" }] } })
            .mockRejectedValueOnce(Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" }));

        let t = 0;
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 0, sessionsCacheTtlMs: 1000, now: () => t });
        expect((await client.getCachedSessions()).map((s) => s.id)).toEqual(["1"]);
        t = 2000; // expired -> refresh fails -> serve stale
        expect((await client.getCachedSessions()).map((s) => s.id)).toEqual(["1"]);
    });

    it("retries on HTTP 429 and honors Retry-After header", async () => {
        vi.useFakeTimers();
        const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 0 });

        vi.mocked(mockInstance.request).mockReset();
        vi.mocked(mockInstance.request)
            .mockRejectedValueOnce({
                response: { status: 429, headers: { "retry-after": "3" } },
                config: { url: "/x" }
            })
            .mockResolvedValueOnce({ data: "ok" });

        const promise = client.listSessions();
        await vi.runAllTimersAsync();
        const result = await promise;

        // Note: listSessions expects data.sessions, so result may be undefined if mock returns { data: "ok" }.
        // However, we just want to ensure it completes and returns what data resolves to.
        expect(result).toBe("ok");
        expect(setTimeoutSpy.mock.calls.some(([, ms]) => ms === 3000)).toBe(true);
        expect(mockInstance.request).toHaveBeenCalledTimes(2);

        setTimeoutSpy.mockRestore();
        vi.useRealTimers();
    });

    it("retries on ECONNRESET network error", async () => {
        vi.useFakeTimers();
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 0 });

        vi.mocked(mockInstance.request).mockReset();
        vi.mocked(mockInstance.request)
            .mockRejectedValueOnce(Object.assign(new Error("socket hang up"), { code: "ECONNRESET", config: { url: "/x" } }))
            .mockResolvedValueOnce({ data: "ok" });

        const promise = client.listSessions();
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe("ok");
        expect(mockInstance.request).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
    });

    it("retries on HTTP 502 gateway error", async () => {
        vi.useFakeTimers();
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 0 });

        vi.mocked(mockInstance.request).mockReset();
        vi.mocked(mockInstance.request)
            .mockRejectedValueOnce({
                response: { status: 502 },
                config: { url: "/x" }
            })
            .mockResolvedValueOnce({ data: "ok" });

        const promise = client.listSessions();
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe("ok");
        expect(mockInstance.request).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
    });

    it("does not retry HTTP 401 and throws JulesApiError", async () => {
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 0 });

        vi.mocked(mockInstance.request).mockReset();
        vi.mocked(mockInstance.request).mockRejectedValueOnce({
            response: { status: 401, data: "Unauthorized" },
            message: "Request failed with status code 401",
            config: { url: "/x" }
        });

        const promise = client.listSessions();
        await expect(promise).rejects.toThrow(JulesApiError);
        await expect(promise).rejects.toMatchObject({ statusCode: 401, body: "Unauthorized" });
        expect(mockInstance.request).toHaveBeenCalledTimes(1);
    });

    it("does not retry non-transient HTTP errors", async () => {
        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 0 });
        vi.mocked(mockInstance.request).mockRejectedValueOnce({
            response: { status: 400, data: "Bad Request" },
            message: "Request failed with status code 400"
        });

        const promise = client.listSessions();
        await expect(promise).rejects.toThrow(JulesApiError);
        await expect(promise).rejects.toMatchObject({ statusCode: 400, body: "Bad Request" });
    });

    it("handles 404 in listAllActivities by throwing JulesNotFoundError", async () => {
        vi.mocked(mockInstance.request).mockReset();
        const err = Object.assign(new Error("Request failed with status code 404"), {
          response: { status: 404 },
          config: { url: "/sessions/sess/activities" }
        });
        vi.mocked(mockInstance.request).mockRejectedValueOnce(err);

        const client = new JulesApiClient({ baseUrl: "http://url", apiKey: "key", minRequestIntervalMs: 0 });
        
        const promise = client.listAllActivities("sess");
        await expect(promise).rejects.toThrow("Jules activities not found for session: sess");
        await expect(promise).rejects.toBeInstanceOf(JulesNotFoundError);
    });
});
