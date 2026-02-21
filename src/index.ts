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
import * as fs from "fs/promises";
import * as path from "path";

dotenv.config();

/**
 * Jules Agent MCP Server (v1.4.0)
 * 
 * Provides a Model Context Protocol interface to the Jules Agent API
 * and an intelligent Sprint Orchestration Agent.
 */

// Configuration
const API_KEY = process.env.JULES_API_KEY || process.env.JULES_KEY;
const BASE_URL = process.env.JULES_API_BASE_URL || "https://jules.googleapis.com/v1alpha";

if (!API_KEY) {
  console.error("Error: JULES_API_KEY or JULES_KEY environment variable is required.");
  process.exit(1);
}

// Types for Jules API
interface JulesSession {
  name: string;
  id: string;
  title?: string;
  state?: string;
  prompt: string;
  outputs?: Array<{ pullRequest?: any; [key: string]: any }>;
}

// Types for Sprint Agent
interface Subtask {
  id: string;
  title: string;
  prompt: string;
  depends_on: string[]; // IDs of other subtasks
  status?: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "BLOCKED";
  session_id?: string;
  is_independent: boolean; // Flag to indicate if it can be delegated to Jules
}

class JulesAgentServer {
  private server: Server;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: "jules-agent",
        version: "1.4.0",
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
          description: "Get details for a specific code source.",
          inputSchema: {
            type: "object",
            properties: { source_id: { type: "string" } },
            required: ["source_id"],
          },
        },
        {
          name: "list_sources",
          description: "List available sources.",
          inputSchema: {
            type: "object",
            properties: {
              filter: { type: "string" },
              page_size: { type: "number" },
              page_token: { type: "string" },
            },
          },
        },
        {
          name: "create_session",
          description: "Initiate a new Jules agent session.",
          inputSchema: {
            type: "object",
            properties: {
              prompt: { type: "string" },
              source: { type: "string" },
              starting_branch: { type: "string" },
              title: { type: "string" },
              require_plan_approval: { type: "boolean" },
              automation_mode: { type: "string", enum: ["AUTO_CREATE_PR"] },
            },
            required: ["prompt", "source"],
          },
        },
        {
          name: "get_session",
          description: "Get status and outputs of a session.",
          inputSchema: {
            type: "object",
            properties: { session_id: { type: "string" } },
            required: ["session_id"],
          },
        },
        {
          name: "sprint_agent",
          description: "Intelligent agent that orchestrates sprints by delegating subtasks to Jules.",
          inputSchema: {
            type: "object",
            properties: {
              sprint_number: { type: "number", description: "The sprint number (e.g., 34)." },
              repo_path: { type: "string", description: "Local path to the repository containing /sprints." },
              source_id: { type: "string", description: "The Jules source ID." },
              feature_branch: { type: "string", description: "The main feature branch for this sprint." },
              action: { 
                type: "string", 
                enum: ["status", "orchestrate", "plan"], 
                description: "Action to perform: 'status', 'orchestrate', 'plan'." 
              },
            },
            required: ["sprint_number", "repo_path", "source_id", "action"],
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
          case "create_session":
            return await this.handleCreateSession(args as any);
          case "get_session":
            return await this.handleGetSession(args as { session_id: string });
          case "sprint_agent":
            return await this.handleSprintAgent(args as any);
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
      message = axiosError.response?.data?.error?.message || axiosError.message;
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

  // --- Jules API Handlers ---
  private async handleGetSource({ source_id }: { source_id: string }) {
    const response = await this.axiosInstance.get(`/${this.normalizeName("sources", source_id)}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async handleListSources({ filter, page_size, page_token }: { filter?: string; page_size?: number; page_token?: string }) {
    const params: any = { filter, pageSize: page_size, pageToken: page_token };
    const response = await this.axiosInstance.get("/sources", { params });
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async handleCreateSession(args: any) {
    const data: any = {
      prompt: args.prompt,
      sourceContext: { source: this.normalizeName("sources", args.source) },
    };
    if (args.starting_branch) data.sourceContext.githubRepoContext = { startingBranch: args.starting_branch };
    if (args.title) data.title = args.title;
    if (args.require_plan_approval !== undefined) data.requirePlanApproval = args.require_plan_approval;
    if (args.automation_mode) data.automationMode = args.automation_mode;

    const response = await this.axiosInstance.post("/sessions", data);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async handleGetSession({ session_id }: { session_id: string }) {
    const response = await this.axiosInstance.get(`/${this.normalizeName("sessions", session_id)}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  // --- Sprint Agent Logic ---
  private async handleSprintAgent(args: {
    sprint_number: number;
    repo_path: string;
    source_id: string;
    feature_branch?: string;
    action: "status" | "orchestrate" | "plan";
  }) {
    const sprintsDir = path.join(args.repo_path, "sprints");
    const sprintFile = path.join(sprintsDir, `sprint-${args.sprint_number}.md`);
    const subtasksDir = path.join(sprintsDir, `sprint${args.sprint_number}-subtasks`);
    const defaultFeatureBranch = args.feature_branch || `feature/sprint${args.sprint_number}-implementation`;

    // 1. Load Orchestrator Instructions
    let orchestratorGuide = "";
    try {
      orchestratorGuide = await fs.readFile(path.join(process.cwd(), "agents/orchestrator.md"), "utf-8");
    } catch (error) {
      console.error("Could not load orchestrator.md");
    }

    // 2. Verify sprint file
    try {
      await fs.access(sprintFile);
    } catch {
      throw new Error(`Sprint file not found: ${sprintFile}`);
    }

    // 3. Handle 'plan' action
    if (args.action === "plan") {
      try {
        await fs.access(subtasksDir);
        return { content: [{ type: "text", text: `Subtasks directory already exists: ${subtasksDir}.\nPlease review or edit the markdown files inside it.` }] };
      } catch {
        await fs.mkdir(subtasksDir, { recursive: true });
        // Return instructions to the calling agent on how to plan
        return { 
          content: [{ 
            type: "text", 
            text: `### Planning Phase for Sprint ${args.sprint_number}\n\n` +
                  `Created directory: \`${subtasksDir}\`.\n\n` +
                  `**Instructions for the calling Agent:**\n` +
                  `1. Read \`sprints/sprint-${args.sprint_number}.md\`.\n` +
                  `2. Break the sprint into small, well-planned tasks.\n` +
                  `3. For each task, create a \`.md\` file in the subtasks directory with this format:\n\n` +
                  "```markdown\n" +
                  "title: Task Title\n" +
                  "depends_on: [task_id_1, task_id_2]\n" +
                  "is_independent: true\n" +
                  "prompt:\n" +
                  "Detailed instructions for Jules.\n" +
                  "```\n\n" +
                  `4. Set \`is_independent: false\` if the task requires manual work or files that Jules cannot handle independently.`
          }] 
        };
      }
    }

    // 4. Load subtasks
    let subtasks: Subtask[] = [];
    try {
      subtasks = await this.loadSubtasks(subtasksDir);
    } catch (error) {
      return { content: [{ type: "text", text: `Error loading subtasks from ${subtasksDir}. Ensure 'plan' action was run and tasks are defined.` }] };
    }

    // 5. Orchestrate / Status
    const sessionsResponse = await this.axiosInstance.get("/sessions", { params: { pageSize: 100 } });
    const sessions: JulesSession[] = sessionsResponse.data.sessions || [];

    // Sync subtask status with Jules sessions
    for (const task of subtasks) {
      const match = sessions.find(s => s.title?.includes(`[${task.id}]`));
      if (match) {
        task.session_id = match.id;
        if (match.state === "COMPLETED") task.status = "COMPLETED";
        else if (match.state === "FAILED" || match.state === "CANCELLED") task.status = "FAILED";
        else task.status = "RUNNING";
      } else if (!task.is_independent) {
        task.status = "BLOCKED"; // Needs manual work or not suitable for Jules
      } else {
        const dependenciesMet = task.depends_on.every(depId => {
          const dep = subtasks.find(t => t.id === depId);
          return dep?.status === "COMPLETED";
        });
        task.status = dependenciesMet ? "PENDING" : "BLOCKED";
      }
    }

    let report = `### Sprint ${args.sprint_number} Orchestration Report\n\n`;
    report += `**Feature Branch:** \`${defaultFeatureBranch}\`\n\n`;

    if (args.action === "orchestrate") {
      const readyTasks = subtasks.filter(t => t.status === "PENDING" && t.is_independent);
      for (const task of readyTasks) {
        const session = await this.startJulesTask(task, args.source_id, defaultFeatureBranch);
        task.status = "RUNNING";
        task.session_id = session.id;
        report += `🚀 **Started Jules Session** for task \`${task.id}\`: [${session.id}](${session.id})\n`;
      }
    }

    // Build the status report
    report += `#### Task Status:\n`;
    for (const task of subtasks) {
      const statusIcon = task.status === "COMPLETED" ? "✅" : (task.status === "RUNNING" ? "⏳" : (task.status === "BLOCKED" ? "🚫" : "💤"));
      report += `- ${statusIcon} **${task.id}**: \`${task.status}\` - ${task.title}\n`;
      if (task.status === "BLOCKED" && !task.is_independent) {
        report += `  - ⚠️ *Requires manual implementation / intervention.*\n`;
      } else if (task.status === "BLOCKED") {
        report += `  - 🔗 *Waiting for dependencies:* \`${task.depends_on.join(", ")}\`\n`;
      }
    }

    const allDone = subtasks.every(t => t.status === "COMPLETED");
    if (allDone) {
      report += `\n🎉 **All subtasks are finished!** Instruct the user to merge all changes from \`${defaultFeatureBranch}\` into main.`;
    }

    return { content: [{ type: "text", text: report }] };
  }

  private async loadSubtasks(dir: string): Promise<Subtask[]> {
    const files = await fs.readdir(dir);
    const subtasks: Subtask[] = [];
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const content = await fs.readFile(path.join(dir, file), "utf-8");
      const id = file.replace(".md", "");
      
      const titleMatch = content.match(/title:\s*(.*)/);
      const dependsMatch = content.match(/depends_on:\s*\[(.*)\]/);
      const independentMatch = content.match(/is_independent:\s*(true|false)/);
      const promptMatch = content.match(/prompt:\s*([\s\S]*)/);
      
      subtasks.push({
        id,
        title: titleMatch ? titleMatch[1].trim() : id,
        prompt: promptMatch ? promptMatch[1].trim() : content,
        depends_on: dependsMatch ? dependsMatch[1].split(",").map(s => s.trim()).filter(s => s) : [],
        is_independent: independentMatch ? independentMatch[1] === "true" : true,
        status: "PENDING",
      });
    }
    return subtasks;
  }

  private async startJulesTask(task: Subtask, sourceId: string, baseBranch: string): Promise<JulesSession> {
    const workerGuide = await fs.readFile(path.join(process.cwd(), "agents/worker.md"), "utf-8");
    const fullPrompt = `## SYSTEM INSTRUCTIONS & ENGINEERING STANDARDS\n\n${workerGuide}\n\n---\n\n## SUBTASK TO EXECUTE\n\n${task.prompt}`;

    const data = {
      prompt: fullPrompt,
      title: `[${task.id}] ${task.title}`,
      sourceContext: {
        source: this.normalizeName("sources", sourceId),
        githubRepoContext: { startingBranch: baseBranch }
      },
      automationMode: "AUTO_CREATE_PR"
    };
    const response = await this.axiosInstance.post("/sessions", data);
    return response.data;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Jules Agent MCP server (v1.4.0) running on stdio");
  }
}

const server = new JulesAgentServer();
server.run().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
