import type {
  ListenArgs,
  PostListenReplyArgs,
  PullInboxArgs,
  StartListenArgs,
} from "../api/mcp/tool-registry.js";
import type { JulesApiClient } from "../integrations/jules-api-client.js";
import type { DashboardSettings, JulesActivity, JulesSession } from "../contracts/app-types.js";
import type { ConnectionChatRepository } from "../repositories/connection-chat-repository.js";
import type { ListenResponse, McpConnectionRole } from "../contracts/connection-chat-types.js";
import type { Logger } from "../shared/logging/logger.js";
import type { ActivitySummaryService } from "../domain/sessions/activity-summary.js";
import type { McpRuntimeRole } from "../contracts/mcp-tool-definitions.js";

interface CoreToolHandlerDependencies {
  julesApi: JulesApiClient;
  activitySummary: ActivitySummaryService;
  normalizeName: (type: string, id: string) => string;
  resolveSessionName: (session: Partial<JulesSession>) => string | undefined;
  fetchRecentActivities: (sessionName: string, pageSize?: number) => Promise<JulesActivity[]>;
  isJulesApiConfigured: () => boolean;
  getMissingJulesApiKeyInstruction: () => string;
  isTrackedCliSession: (sessionId: string) => boolean;
  getTrackedSession: (sessionId: string) => JulesSession | null;
  getDashboardSettings: () => DashboardSettings;
  connectionChatRepository: ConnectionChatRepository;
  logger?: Logger;
}

const DEFAULT_LISTEN_POLL_INTERVAL_MS = 3000;
const MIN_LISTEN_TIMEOUT_SECONDS = 1;
const MAX_LISTEN_TIMEOUT_SECONDS = 3600;
const MIN_LISTEN_POLL_INTERVAL_MS = 100;
const MAX_LISTEN_POLL_INTERVAL_MS = 10000;

const sleep = async (ms: number): Promise<void> => {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export class CoreToolHandler {
  constructor(private readonly deps: CoreToolHandlerDependencies) {}

  private ensureJulesApiConfigured(): void {
    if (!this.deps.isJulesApiConfigured()) {
      throw new Error(this.deps.getMissingJulesApiKeyInstruction());
    }
  }

  async handleGetSession({ session_id }: { session_id: string }) {
    if (this.deps.isTrackedCliSession(session_id)) {
      const session = this.deps.getTrackedSession(session_id);
      if (!session) {
        throw new Error(`Session not found: ${session_id}`);
      }
      return { content: [{ type: "text", text: JSON.stringify(this.deps.activitySummary.toSessionSummary(session), null, 2) }] };
    }

    this.ensureJulesApiConfigured();
    const session = await this.deps.julesApi.getSession(session_id);
    let lastActivity: JulesActivity | undefined;

    try {
      const sessionName = this.deps.resolveSessionName(session) || this.deps.normalizeName("sessions", session_id);
      const activities = await this.deps.fetchRecentActivities(sessionName, this.deps.activitySummary.getActivityRecentLimit());
      if (activities.length > 0) {
        lastActivity = activities[activities.length - 1];
      }
    } catch {
      this.deps.logger?.warn("Could not fetch activities for session", { sessionId: session_id });
    }

    return { content: [{ type: "text", text: JSON.stringify(this.deps.activitySummary.toSessionSummary(session, lastActivity), null, 2) }] };
  }

  async handleStartListen(args: StartListenArgs) {
    const response = this.deps.connectionChatRepository.startListen({
      connectionKey: args.connection_key,
      displayName: args.display_name,
      role: args.role,
      projectId: args.project_id,
      projectIds: args.project_ids,
      activeProjectIds: args.active_project_ids,
      transport: args.transport,
      capabilities: args.capabilities,
      maxMessages: args.max_messages,
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify(response, null, 2),
      }],
    };
  }

  async handleListen(args: ListenArgs) {
    return this.handleListenForRuntime(args, "project_manager");
  }

  async handleListenForRuntime(args: ListenArgs, runtimeRole: McpRuntimeRole) {
    const normalizedArgs = args;
    const settings = this.deps.getDashboardSettings();
    const timeoutSeconds = this.normalizeListenTimeoutSeconds(normalizedArgs.timeout_seconds, settings, normalizedArgs.role);
    const pollIntervalMs = this.normalizeListenPollIntervalMs(normalizedArgs.poll_interval_ms);
    const shouldIncludeTaskDispatch = false;

    const startResponse = this.deps.connectionChatRepository.startListen({
      connectionKey: normalizedArgs.connection_key,
      displayName: normalizedArgs.display_name,
      role: normalizedArgs.role,
      projectId: normalizedArgs.project_id,
      projectIds: normalizedArgs.project_ids,
      activeProjectIds: normalizedArgs.active_project_ids,
      transport: normalizedArgs.transport,
      capabilities: normalizedArgs.capabilities,
      maxMessages: 1,
    });

    const immediateInboxMessage = startResponse.inbox[0];
    if (immediateInboxMessage) {
      return this.wrapListenResponse({
        kind: "dashboard_message",
        message: {
          id: immediateInboxMessage.id,
          threadId: immediateInboxMessage.threadId,
          projectId: immediateInboxMessage.projectId,
          bodyMarkdown: immediateInboxMessage.bodyMarkdown,
          metadata: immediateInboxMessage.metadata,
        },
        continuation: {
          nextTool: "listen",
          instruction: "Reply in the dashboard thread with post_listen_reply, then call listen again with the same connection_key to stay in listening mode.",
        },
      });
    }

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutSeconds * 1000) {
      const inbox = this.deps.connectionChatRepository.pullInbox({
        connectionKey: normalizedArgs.connection_key,
        projectId: normalizedArgs.project_id,
        maxMessages: 1,
      });
      const message = inbox[0];
      if (message) {
        return this.wrapListenResponse({
          kind: "dashboard_message",
          message: {
            id: message.id,
            threadId: message.threadId,
            projectId: message.projectId,
            bodyMarkdown: message.bodyMarkdown,
            metadata: message.metadata,
          },
          continuation: {
            nextTool: "listen",
            instruction: "Reply in the dashboard thread with post_listen_reply, then call listen again with the same connection_key to stay in listening mode.",
          },
        });
      }

      void shouldIncludeTaskDispatch;

      const remainingMs = timeoutSeconds * 1000 - (Date.now() - startTime);
      if (remainingMs <= 0) {
        break;
      }
      await sleep(Math.min(pollIntervalMs, remainingMs));
    }

    return this.wrapListenResponse({
      kind: "noop_timeout",
      continuation: {
        nextTool: "listen",
          instruction: "No new dashboard messages arrived before timeout. Call listen again immediately with the same connection_key if you should remain in listening mode.",
        },
      });
  }

  async handlePullInbox(args: PullInboxArgs) {
    const inbox = this.deps.connectionChatRepository.pullInbox({
      connectionKey: args.connection_key,
      projectId: args.project_id,
      maxMessages: args.max_messages,
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ returnedCount: inbox.length, inbox }, null, 2),
      }],
    };
  }

  async handlePostListenReply(args: PostListenReplyArgs) {
    const message = this.deps.connectionChatRepository.postListenReply({
      connectionKey: args.connection_key,
      threadId: args.thread_id,
      bodyMarkdown: args.body_markdown,
      replyToMessageId: args.reply_to_message_id,
      metadata: args.metadata,
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          threadId: message.threadId,
          deliveryStatus: message.deliveryStatus,
        }, null, 2),
      }],
    };
  }

  private normalizeListenTimeoutSeconds(
    requestedTimeoutSeconds: number | undefined,
    settings: DashboardSettings,
    role?: McpConnectionRole,
  ): number {
    const fallback = settings.sprintLoopSteps?.watchLoopOutputIntervalSeconds ?? 300;
    const candidate = requestedTimeoutSeconds ?? fallback;
    if (!Number.isFinite(candidate) || candidate <= 0) {
      return fallback;
    }
    return Math.max(MIN_LISTEN_TIMEOUT_SECONDS, Math.min(MAX_LISTEN_TIMEOUT_SECONDS, candidate));
  }

  private normalizeListenPollIntervalMs(requestedPollIntervalMs: number | undefined): number {
    const candidate = requestedPollIntervalMs ?? DEFAULT_LISTEN_POLL_INTERVAL_MS;
    if (!Number.isFinite(candidate) || candidate <= 0) {
      return DEFAULT_LISTEN_POLL_INTERVAL_MS;
    }
    return Math.max(MIN_LISTEN_POLL_INTERVAL_MS, Math.min(MAX_LISTEN_POLL_INTERVAL_MS, candidate));
  }

  private wrapListenResponse(response: ListenResponse) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify(response, null, 2),
      }],
    };
  }
}
