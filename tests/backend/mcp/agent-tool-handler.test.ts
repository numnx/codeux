import { describe, expect, it, vi } from "vitest";
import { AgentToolHandler } from "../../../src/mcp/agent-tool-handler.js";

describe("AgentToolHandler", () => {
    const defaultDeps = {
        workerInboxReplyService: {
            generateReply: vi.fn().mockResolvedValue({ bodyMarkdown: "reply" }),
        } as any,
    };

    it("handleGenerateDashboardReply proxies reply generation", async () => {
        const handler = new AgentToolHandler(defaultDeps);
        const res = await handler.handleGenerateDashboardReply({
            project_id: "project-1",
            thread_id: "thread-1",
            thread_title: "Status",
            body_markdown: "What is running?",
        });
        expect(defaultDeps.workerInboxReplyService.generateReply).toHaveBeenCalledWith({
            projectId: "project-1",
            threadId: "thread-1",
            threadTitle: "Status",
            bodyMarkdown: "What is running?",
        });
        expect((res as any).content[0].text).toContain("reply");
    });
});
