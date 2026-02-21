#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";
import dotenv from "dotenv";

dotenv.config();

/**
 * Jules Agent MCP Server
 * 
 * Provides a Model Context Protocol interface to the Jules Agent API.
 */

// Configuration
const API_KEY = process.env.JULES_API_KEY || process.env.JULES_KEY;
const BASE_URL = process.env.JULES_API_BASE_URL || "https://jules.googleapis.com/v1alpha";

if (!API_KEY) {
  console.error("Error: JULES_API_KEY or JULES_KEY environment variable is required.");
  process.exit(1);
}

// Types for Jules API
interface JulesSource {
  name: string;
  id: string;
  githubRepo?: {
    owner: string;
    repo: string;
    isPrivate?: boolean;
    defaultBranch?: { displayName: string };
  };
}

interface JulesSession {
  name: string;
  id: string;
  title?: string;
  state?: string;
  createTime?: string;
  updateTime?: string;
  prompt: string;
  outputs?: Array<{ pullRequest?: any; [key: string]: any }>;
}

interface JulesActivity {
  name: string;
  id: string;
  createTime: string;
  originator: "agent" | "user";
  [key: string]: any;
}

class JulesAgentServer {
  private server: Server;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: "jules-agent",
        version: "1.2.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      headers: {
        "X-Goog-Api-Key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    this.setupToolHandlers();
    
    // Structured error logging
    this.server.onerror = (error) => {
      console.error("[MCP Server Error]", JSON.stringify(error, null, 2));
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_source",
          description: "Retrieve comprehensive details for a specific code source (e.g., a GitHub repository).",
          inputSchema: {
            type: "object",
            properties: {
              source_id: { 
                type: "string", 
                description: "The unique identifier for the source. Format: 'github/owner/repo' or 'sources/github/owner/repo'." 
              },
            },
            required: ["source_id"],
          },
        },
        {
          name: "list_sources",
          description: "Enumerate available code sources with filtering and pagination capabilities.",
          inputSchema: {
            type: "object",
            properties: {
              filter: { type: "string", description: "A filter string to narrow down results based on Jules API syntax." },
              page_size: { type: "number", description: "Maximum number of items to include in the response (default: 50)." },
              page_token: { type: "string", description: "Token for retrieving the subsequent page of results." },
            },
          },
        },
        {
          name: "list_all_sources",
          description: "Retrieve the complete list of available sources by automatically handling multi-page results.",
          inputSchema: {
            type: "object",
            properties: {
              filter: { type: "string", description: "Filter criteria for the source list." },
            },
          },
        },
        {
          name: "create_session",
          description: "Initiate a new agent session to perform tasks on a specific codebase.",
          inputSchema: {
            type: "object",
            properties: {
              prompt: { 
                type: "string", 
                description: "The objective or instruction for the agent (e.g., 'Fix the login bug')." 
              },
              source: { 
                type: "string", 
                description: "The source resource name (e.g., 'sources/github/owner/repo')." 
              },
              starting_branch: { 
                type: "string", 
                description: "The base branch to branch off from (e.g., 'main')." 
              },
              title: { 
                type: "string", 
                description: "A descriptive title for the session." 
              },
              require_plan_approval: { 
                type: "boolean", 
                description: "If true, the agent will pause for approval after generating its implementation plan." 
              },
              automation_mode: { 
                type: "string", 
                enum: ["AUTO_CREATE_PR"], 
                description: "Configuration for automated downstream actions like PR creation." 
              },
            },
            required: ["prompt", "source"],
          },
        },
        {
          name: "get_session",
          description: "Get the current status, state, and outputs of an active or historical session.",
          inputSchema: {
            type: "object",
            properties: {
              session_id: { type: "string", description: "The unique session ID or full resource name." },
            },
            required: ["session_id"],
          },
        },
        {
          name: "list_sessions",
          description: "List recent agent sessions with pagination.",
          inputSchema: {
            type: "object",
            properties: {
              page_size: { type: "number", description: "Maximum sessions per page." },
              page_token: { type: "string", description: "Token for pagination." },
            },
          },
        },
        {
          name: "approve_session_plan",
          description: "Authorize the agent to proceed with the proposed plan in a session where 'require_plan_approval' was set.",
          inputSchema: {
            type: "object",
            properties: {
              session_id: { type: "string", description: "The session ID." },
            },
            required: ["session_id"],
          },
        },
        {
          name: "send_session_message",
          description: "Provide additional feedback, instructions, or corrections to the agent during an active session.",
          inputSchema: {
            type: "object",
            properties: {
              session_id: { type: "string", description: "The session ID." },
              prompt: { type: "string", description: "The message content." },
            },
            required: ["session_id", "prompt"],
          },
        },
        {
          name: "wait_for_session_completion",
          description: "Monitor a session until it reaches a terminal state (COMPLETED/FAILED) or a PR is generated.",
          inputSchema: {
            type: "object",
            properties: {
              session_id: { type: "string", description: "The session ID." },
              poll_interval: { 
                type: "number", 
                default: 10, 
                description: "Seconds between status checks (minimum: 5)." 
              },
              timeout: { 
                type: "number", 
                default: 900, 
                description: "Total seconds to wait before timing out (default: 15 minutes)." 
              },
            },
            required: ["session_id"],
          },
        },
        {
          name: "get_activity",
          description: "Retrieve detailed information about a specific step or interaction (activity) within a session.",
          inputSchema: {
            type: "object",
            properties: {
              session_id: { type: "string", description: "The session ID." },
              activity_id: { type: "string", description: "The activity ID or name." },
            },
            required: ["session_id", "activity_id"],
          },
        },
        {
          name: "list_activities",
          description: "Fetch a chronologically ordered list of activities for a session.",
          inputSchema: {
            type: "object",
            properties: {
              session_id: { type: "string", description: "The session ID." },
              page_size: { type: "number", description: "Maximum activities per page." },
              page_token: { type: "string", description: "Token for pagination." },
            },
            required: ["session_id"],
          },
        },
        {
          name: "list_all_activities",
          description: "Retrieve all activities for a session by automatically iterating through all pages.",
          inputSchema: {
            type: "object",
            properties: {
              session_id: { type: "string", description: "The session ID." },
            },
            required: ["session_id"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_source":
            return await this.handleGetSource(args as { source_id: string });
          case "list_sources":
            return await this.handleListSources(args as { filter?: string; page_size?: number; page_token?: string });
          case "list_all_sources":
            return await this.handleListAllSources(args as { filter?: string });
          case "create_session":
            return await this.handleCreateSession(args as any);
          case "get_session":
            return await this.handleGetSession(args as { session_id: string });
          case "list_sessions":
            return await this.handleListSessions(args as { page_size?: number; page_token?: string });
          case "approve_session_plan":
            return await this.handleApproveSessionPlan(args as { session_id: string });
          case "send_session_message":
            return await this.handleSendSessionMessage(args as { session_id: string; prompt: string });
          case "wait_for_session_completion":
            return await this.handleWaitForSessionCompletion(args as { session_id: string; poll_interval?: number; timeout?: number });
          case "get_activity":
            return await this.handleGetActivity(args as { session_id: string; activity_id: string });
          case "list_activities":
            return await this.handleListActivities(args as { session_id: string; page_size?: number; page_token?: string });
          case "list_all_activities":
            return await this.handleListAllActivities(args as { session_id: string });
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
        }
      } catch (error: any) {
        return this.formatError(error);
      }
    });
  }

  private formatError(error: any) {
    let message = error.message || "An unknown error occurred";
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const apiMessage = axiosError.response?.data?.error?.message;
      const apiDetails = axiosError.response?.data?.error?.details;
      message = apiMessage || axiosError.message;
      if (apiDetails) {
        message += ` (Details: ${JSON.stringify(apiDetails)})`;
      }
    }
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }

  private normalizeName(type: string, id: string): string {
    if (id.startsWith(`${type}/`)) return id;
    return `${type}/${id}`;
  }

  // Implementation of handlers
  private async handleGetSource({ source_id }: { source_id: string }) {
    const name = this.normalizeName("sources", source_id);
    const response = await this.axiosInstance.get(`/${name}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async handleListSources({ filter, page_size, page_token }: { filter?: string; page_size?: number; page_token?: string }) {
    const params: any = {};
    if (filter) params.filter = filter;
    if (page_size) params.pageSize = page_size;
    if (page_token) params.pageToken = page_token;
    const response = await this.axiosInstance.get("/sources", { params });
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async handleListAllSources({ filter }: { filter?: string }) {
    let allSources: JulesSource[] = [];
    let pageToken: string | undefined = undefined;
    do {
      const params: any = {};
      if (filter) params.filter = filter;
      if (pageToken) params.pageToken = pageToken;
      const response = await this.axiosInstance.get<{ sources?: JulesSource[], nextPageToken?: string }>("/sources", { params });
      allSources = allSources.concat(response.data.sources || []);
      pageToken = response.data.nextPageToken;
    } while (pageToken);
    return { content: [{ type: "text", text: JSON.stringify({ sources: allSources }, null, 2) }] };
  }

  private async handleCreateSession(args: {
    prompt: string;
    source: string;
    starting_branch?: string;
    title?: string;
    require_plan_approval?: boolean;
    automation_mode?: string;
  }) {
    const data: any = {
      prompt: args.prompt,
      sourceContext: {
        source: this.normalizeName("sources", args.source),
      },
    };
    if (args.starting_branch) {
      data.sourceContext.githubRepoContext = { startingBranch: args.starting_branch };
    }
    if (args.title) data.title = args.title;
    if (args.require_plan_approval !== undefined) data.requirePlanApproval = args.require_plan_approval;
    if (args.automation_mode) data.automationMode = args.automation_mode;

    const response = await this.axiosInstance.post("/sessions", data);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async handleGetSession({ session_id }: { session_id: string }) {
    const name = this.normalizeName("sessions", session_id);
    const response = await this.axiosInstance.get(`/${name}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async handleListSessions({ page_size, page_token }: { page_size?: number; page_token?: string }) {
    const params: any = {};
    if (page_size) params.pageSize = page_size;
    if (page_token) params.pageToken = page_token;
    const response = await this.axiosInstance.get("/sessions", { params });
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async handleApproveSessionPlan({ session_id }: { session_id: string }) {
    const name = this.normalizeName("sessions", session_id);
    const response = await this.axiosInstance.post(`/${name}:approvePlan`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async handleSendSessionMessage({ session_id, prompt }: { session_id: string; prompt: string }) {
    const name = this.normalizeName("sessions", session_id);
    const response = await this.axiosInstance.post(`/${name}:sendMessage`, { prompt });
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async handleWaitForSessionCompletion({ 
    session_id, 
    poll_interval = 10, 
    timeout = 900 
  }: { 
    session_id: string; 
    poll_interval?: number; 
    timeout?: number 
  }) {
    const startTime = Date.now();
    const name = this.normalizeName("sessions", session_id);
    const actualPollInterval = Math.max(5, poll_interval);
    
    console.error(`Waiting for session ${session_id} to complete (timeout: ${timeout}s, interval: ${actualPollInterval}s)...`);

    while (Date.now() - startTime < timeout * 1000) {
      const response = await this.axiosInstance.get<JulesSession>(`/${name}`);
      const session = response.data;
      
      const isCompleted = session.state === "COMPLETED";
      const isFailed = session.state === "FAILED" || session.state === "CANCELLED";
      const hasPR = session.outputs?.some((o: any) => o.pullRequest);

      if (isCompleted || isFailed || hasPR) {
        return { 
          content: [
            { 
              type: "text", 
              text: `Session ${session.state || "finished"}.\n\n${JSON.stringify(session, null, 2)}` 
            }
          ] 
        };
      }

      await new Promise(resolve => setTimeout(resolve, actualPollInterval * 1000));
    }
    
    throw new Error(`Timeout exceeded (${timeout}s) waiting for session ${session_id} to complete.`);
  }

  private async handleGetActivity({ session_id, activity_id }: { session_id: string; activity_id: string }) {
    const sessionName = this.normalizeName("sessions", session_id);
    const activityName = this.normalizeName("activities", activity_id);
    const response = await this.axiosInstance.get(`/${sessionName}/${activityName}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async handleListActivities({ session_id, page_size, page_token }: { session_id: string; page_size?: number; page_token?: string }) {
    const sessionName = this.normalizeName("sessions", session_id);
    const params: any = {};
    if (page_size) params.pageSize = page_size;
    if (page_token) params.pageToken = page_token;
    const response = await this.axiosInstance.get(`/${sessionName}/activities`, { params });
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async handleListAllActivities({ session_id }: { session_id: string }) {
    const sessionName = this.normalizeName("sessions", session_id);
    let allActivities: JulesActivity[] = [];
    let pageToken: string | undefined = undefined;
    do {
      const params: any = {};
      if (pageToken) params.pageToken = pageToken;
      const response = await this.axiosInstance.get<{ activities?: JulesActivity[], nextPageToken?: string }>(`/${sessionName}/activities`, { params });
      allActivities = allActivities.concat(response.data.activities || []);
      pageToken = response.data.nextPageToken;
    } while (pageToken);
    return { content: [{ type: "text", text: JSON.stringify({ activities: allActivities }, null, 2) }] };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Jules Agent MCP server (v1.2.0) running on stdio");
  }
}

const server = new JulesAgentServer();
server.run().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
