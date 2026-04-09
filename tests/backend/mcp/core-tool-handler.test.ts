import { beforeEach, describe, expect, it, vi } from "vitest";
import { CoreToolHandler } from "../../../src/mcp/core-tool-handler.js";

describe("CoreToolHandler", () => {
  let deps: any;
  let handler: CoreToolHandler;

  beforeEach(() => {
    deps = {
      julesApi: {
        getSession: vi.fn(async () => ({ id: "session-1", state: "COMPLETED" })),
      },
      activitySummary: {
        toSessionSummary: vi.fn((session: unknown) => session),
        getActivityRecentLimit: vi.fn(() => 5),
      },
      normalizeName: vi.fn((_type: string, id: string) => id),
      resolveSessionName: vi.fn(() => "session-1"),
      fetchRecentActivities: vi.fn(async () => []),
      isJulesApiConfigured: vi.fn(() => true),
      getMissingJulesApiKeyInstruction: vi.fn(() => "missing key"),
      isTrackedCliSession: vi.fn(() => false),
      getTrackedSession: vi.fn(() => null),
      getDashboardSettings: vi.fn(() => ({ sprintLoopSteps: { watchLoopOutputIntervalSeconds: 300 } })),
      connectionChatRepository: {
        startListen: vi.fn(() => ({ connection: { id: "conn-1" }, inbox: [] })),
        pullInbox: vi.fn(() => []),
        postListenReply: vi.fn(() => ({ threadId: "thread-1", deliveryStatus: "processed" })),
      },
      logger: {
        warn: vi.fn(),
      },
    };
    handler = new CoreToolHandler(deps);
  });

  it("returns tracked CLI sessions without calling the Jules API", async () => {
    deps.isTrackedCliSession.mockReturnValue(true);
    deps.getTrackedSession.mockReturnValue({ id: "tracked-1" });

    const result = await handler.handleGetSession({ session_id: "tracked-1" });

    expect(deps.julesApi.getSession).not.toHaveBeenCalled();
    expect(JSON.parse(String(result.content[0]?.text))).toEqual({ id: "tracked-1" });
  });

  it("registers listen connections and returns immediate inbox messages", async () => {
    deps.connectionChatRepository.startListen.mockReturnValue({
      connection: { id: "conn-1" },
      inbox: [{
        id: "message-1",
        threadId: "thread-1",
        projectId: "project-1",
        bodyMarkdown: "hello",
        createdAt: "2026-01-01T00:00:00.000Z",
        deliveryStatus: "delivered",
      }],
    });

    const result = await handler.handleListen({ connection_key: "listener-1", project_id: "project-1" });
    const parsed = JSON.parse(String(result.content[0]?.text));

    expect(parsed.kind).toBe("dashboard_message");
    expect(parsed.message.threadId).toBe("thread-1");
    expect(parsed.message.bodyMarkdown).toBe("hello");
  });

  it("returns noop timeouts when no inbox messages arrive", async () => {
    deps.getDashboardSettings.mockReturnValue({ sprintLoopSteps: { watchLoopOutputIntervalSeconds: 1 } });

    const result = await handler.handleListen({ connection_key: "listener-1", timeout_seconds: 0.01 });
    const parsed = JSON.parse(String(result.content[0]?.text));

    expect(parsed.kind).toBe("noop_timeout");
  });

  it("proxies pull_inbox and post_listen_reply", async () => {
    deps.connectionChatRepository.pullInbox.mockReturnValue([{ id: "message-1" }]);

    const inbox = await handler.handlePullInbox({ connection_key: "listener-1", max_messages: 1 });
    const reply = await handler.handlePostListenReply({
      connection_key: "listener-1",
      thread_id: "thread-1",
      body_markdown: "done",
    });

    expect(JSON.parse(String(inbox.content[0]?.text)).returnedCount).toBe(1);
    expect(JSON.parse(String(reply.content[0]?.text))).toEqual({
      threadId: "thread-1",
      deliveryStatus: "processed",
    });
  });
});
