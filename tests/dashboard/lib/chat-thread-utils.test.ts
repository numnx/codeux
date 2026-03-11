import { describe, expect, it } from "vitest";
import type { ChatThread } from "../../../dashboard/src/v2/types.js";
import { upsertChatThread } from "../../../dashboard/src/v2/lib/chat-thread-utils.js";

const createThread = (overrides: Partial<ChatThread> = {}): ChatThread => ({
  id: "thread-1",
  projectId: "project-1",
  connectionId: null,
  scope: "project",
  title: "Thread",
  status: "open",
  createdAt: "2026-03-10T12:00:00.000Z",
  updatedAt: "2026-03-10T12:00:00.000Z",
  messageCount: 0,
  pendingMessageCount: 0,
  lastMessageAt: null,
  lastMessagePreview: null,
  ...overrides,
});

describe("upsertChatThread", () => {
  it("deduplicates the same thread when optimistic create and realtime update race", () => {
    const created = createThread({
      id: "thread-optimistic",
      title: "Project Chat Mar 10",
      updatedAt: "2026-03-10T12:00:00.000Z",
    });
    const realtime = createThread({
      id: "thread-optimistic",
      title: "Project Chat Mar 10",
      updatedAt: "2026-03-10T12:00:01.000Z",
      lastMessageAt: "2026-03-10T12:00:01.000Z",
    });

    const once = upsertChatThread([], created);
    const twice = upsertChatThread(once, realtime);

    expect(twice).toHaveLength(1);
    expect(twice[0]).toMatchObject({
      id: "thread-optimistic",
      updatedAt: "2026-03-10T12:00:01.000Z",
    });
  });

  it("keeps threads sorted by latest activity after upsert", () => {
    const older = createThread({
      id: "thread-older",
      updatedAt: "2026-03-10T12:00:00.000Z",
      lastMessageAt: "2026-03-10T12:00:00.000Z",
    });
    const newer = createThread({
      id: "thread-newer",
      updatedAt: "2026-03-10T12:01:00.000Z",
      lastMessageAt: "2026-03-10T12:01:00.000Z",
    });

    const ordered = upsertChatThread([older], newer);

    expect(ordered.map((thread) => thread.id)).toEqual(["thread-newer", "thread-older"]);
  });
});
