import type { WorkerInboxReplyService } from "../services/worker-inbox-reply-service.js";

interface AgentToolHandlerDependencies {
  workerInboxReplyService: WorkerInboxReplyService;
}

export class AgentToolHandler {
  constructor(private readonly deps: AgentToolHandlerDependencies) {}

  async handleGenerateDashboardReply(args: {
    project_id: string;
    thread_id: string;
    thread_title?: string;
    body_markdown: string;
    mode?: "reply" | "compact_thread";
  }) {
    const result = await this.deps.workerInboxReplyService.generateReply({
      projectId: args.project_id,
      threadId: args.thread_id,
      threadTitle: args.thread_title,
      bodyMarkdown: args.body_markdown,
      mode: args.mode,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
}
