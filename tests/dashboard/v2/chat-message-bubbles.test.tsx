/** @jsx h */
// @vitest-environment jsdom
import { h } from "preact";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/preact";
import * as matchers from "@testing-library/jest-dom/matchers";
import { ChatMessageBubble } from "../../../dashboard/src/v2/components/chat/ChatMessageBubble.js";
import { InvocationMessageBubble } from "../../../dashboard/src/v2/components/chat/InvocationMessageBubble.js";
import { WorkingBubble } from "../../../dashboard/src/v2/components/chat/WorkingBubble.js";
import type { ChatMessageRecord, ExecutionInvocationMessageRecord, ConversationRuntimeState } from "../../../dashboard/src/v2/types.js";

expect.extend(matchers);

vi.mock("../../../dashboard/src/v2/lib/markdown.js", () => ({
  renderMarkdown: (md: string) => `<p>${md}</p>`
}));

describe("Chat Message Bubbles", () => {
  describe("ChatMessageBubble", () => {
    it("renders plain markdown when no planning metadata is present", () => {
      const message: ChatMessageRecord = {
        id: "msg_1",
        threadId: "thread_1",
        direction: "connection_to_dashboard",
        authorType: "connection",
        authorConnectionId: "conn_1",
        bodyMarkdown: "Hello world",
        deliveryStatus: "delivered",
        createdAt: new Date().toISOString(),
        metadata: null,
      };

      const { container } = render(<ChatMessageBubble message={message} />);
      expect(container.innerHTML).toContain("Hello world");
    });

    it("renders a planning widget when planning metadata is present", () => {
      const message: ChatMessageRecord = {
        id: "msg_2",
        threadId: "thread_1",
        direction: "dashboard_to_connection",
        authorType: "dashboard_user",
        authorConnectionId: null,
        bodyMarkdown: "Make a plan",
        deliveryStatus: "delivered",
        createdAt: new Date().toISOString(),
        metadata: {
          type: "planning",
          status: "running",
          planName: "My special plan"
        },
      };

      const { container, getByText } = render(<ChatMessageBubble message={message} />);
      expect(getByText("My special plan")).toBeInTheDocument();
      expect(getByText("Navigating solutions...")).toBeInTheDocument();
    });
  });

  describe("InvocationMessageBubble", () => {
    it("renders plain markdown and tool calls for standard messages", () => {
      const message: ExecutionInvocationMessageRecord = {
        id: "msg_1",
        invocationId: "inv_1",
        role: "assistant",
        contentMarkdown: "Using tool",
        toolCallsJson: { tool: "test" },
        createdAt: new Date().toISOString(),
      };

      const { container } = render(<InvocationMessageBubble message={message} />);
      expect(container.innerHTML).toContain("Using tool");
      expect(container.innerHTML).toContain('"tool": "test"');
    });

    it("renders a planning widget when metadata indicates virtual route", () => {
      const message: ExecutionInvocationMessageRecord = {
        id: "msg_2",
        invocationId: "inv_1",
        role: "assistant",
        contentMarkdown: "Working on it",
        toolCallsJson: null,
        createdAt: new Date().toISOString(),
        metadata: {
          routeKind: "virtual",
          status: "queued"
        }
      };

      const { getByText } = render(<InvocationMessageBubble message={message} />);
      expect(getByText("Execution Plan")).toBeInTheDocument();
      expect(getByText("Preparing to plan...")).toBeInTheDocument();
    });
  });

  describe("WorkingBubble", () => {
    it("renders the default listener pulsing message when not planning", () => {
      const { getByText } = render(<WorkingBubble displayName="TestWorker" runtimeState={null} />);
      expect(getByText("TestWorker is preparing a reply")).toBeInTheDocument();
    });

    it("renders an animated planning widget when routeKind is virtual", () => {
      const runtimeState: ConversationRuntimeState = {
        routeKind: "virtual"
      };

      const { getAllByText } = render(<WorkingBubble displayName="TestWorker" runtimeState={runtimeState} />);
      expect(getAllByText("Execution Plan").length).toBeGreaterThan(0);
      expect(getAllByText("Working").length).toBeGreaterThan(0);
    });
  });
});