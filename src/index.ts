#!/usr/bin/env node
import dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { loadAppConfig } from "./config/app-config.js";
import { JulesAgentServer } from "./server/jules-agent-server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(projectRoot, ".env") });

export async function main(args: string[] = process.argv) {
  const appConfig = loadAppConfig(args, projectRoot);

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Sprint OS MCP Server");
    console.log("");
    console.log("Usage: sprint-os [options]");
    console.log("");
    console.log("Options:");
    console.log("  --api-key VALUE   Set the Jules API key (overrides env and settings)");
    console.log("  --runtime-role VALUE");
    console.log("                    Runtime role: project_manager (default) or worker-host");
    console.log("  --headless        Start MCP-only without binding the dashboard");
    console.log("  --help, -h        Show this help message");
    console.log("");
    console.log("Environment Variables:");
    console.log("  JULES_API_KEY     Jules API key");
    console.log("  DASHBOARD_PORT    Port for the dashboard (default: 4444)");
    process.exit(0);
  }

  const server = new JulesAgentServer({ projectRoot, appConfig });

  try {
    await server.run();
  } catch (error) {
    console.error("Fatal error starting server:", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error("Unhandled error in main:", error);
    process.exit(1);
  });
}
