import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { McpToolArgsByName, McpToolResponse } from "../api/mcp/tool-registry.js";
import { ToolRegistry } from "../api/mcp/tool-registry.js";
import type { DashboardSettings } from "../contracts/app-types.js";
import type { AgentToolHandler } from "../mcp/agent-tool-handler.js";
import type { CoreToolHandler } from "../mcp/core-tool-handler.js";
import { getEnabledToolDefinitions, isToolEnabled } from "../mcp/mcp-tool-availability.js";

export interface McpRequestRouterArgs {
  server: Server;
  coreToolHandler: CoreToolHandler;
  agentToolHandler: AgentToolHandler;
  getDashboardSettings: () => DashboardSettings;
  formatError: (error: unknown) => { content: Array<{ type: string; text: string }>; isError: true };
}

export const registerMcpRequestHandlers = (args: McpRequestRouterArgs): void => {
  const toolRegistry = new ToolRegistry<McpToolArgsByName, McpToolResponse>()
    .register("get_source", (input) => args.coreToolHandler.handleGetSource(input))
    .register("list_sources", (input) => args.coreToolHandler.handleListSources(input))
    .register("list_all_sources", (input) => args.coreToolHandler.handleListAllSources(input))
    .register("create_session", (input) => args.coreToolHandler.handleCreateSession(input))
    .register("get_session", (input) => args.coreToolHandler.handleGetSession(input))
    .register("list_sessions", (input) => args.coreToolHandler.handleListSessions(input))
    .register("approve_session_plan", (input) => args.coreToolHandler.handleApproveSessionPlan(input))
    .register("send_session_message", (input) => args.coreToolHandler.handleSendSessionMessage(input))
    .register("wait_for_session_completion", (input) => args.coreToolHandler.handleWaitForSessionCompletion(input))
    .register("get_activity", (input) => args.coreToolHandler.handleGetActivity(input))
    .register("list_activities", (input) => args.coreToolHandler.handleListActivities(input))
    .register("list_all_activities", (input) => args.coreToolHandler.handleListAllActivities(input))
    .register("sprint_agent", (input) => args.agentToolHandler.handleSprintAgent(input))
    .register("task_agent", (input) => args.agentToolHandler.handleTaskAgent(input));

  args.server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getEnabledToolDefinitions(args.getDashboardSettings()) as any,
  }));

  args.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArgs } = request.params;
    if (!isToolEnabled(args.getDashboardSettings(), name)) {
      throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
    }

    try {
      return await toolRegistry.dispatch(name, toolArgs);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith("Tool not found:")) {
        throw new McpError(ErrorCode.MethodNotFound, error.message);
      }
      return args.formatError(error);
    }
  });
};
