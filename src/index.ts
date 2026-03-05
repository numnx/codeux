#!/usr/bin/env node
import dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { loadAppConfig } from "./config/app-config.js";
import { JulesAgentServer } from "./server/jules-agent-server.js";
import {
  parseMigrateSprintsArgs,
  runMigrateSprintsCommand,
  printImportResult,
} from "./domain/sprint/migration/migrate-sprints-command.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(projectRoot, ".env") });

export async function main(args: string[] = process.argv) {
  const appConfig = loadAppConfig(args, projectRoot);

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Jules Agent MCP Server");
    console.log("");
    console.log("Usage: jules-agent [options]");
    console.log("");
    console.log("Options:");
    console.log("  --api-key VALUE   Set the Jules API key (overrides env and settings)");
    console.log("  --migrate-sprints Run the legacy sprint migration command");
    console.log("    --sprints-dir PATH  Path to the sprints directory (required)");
    console.log("    --db-path PATH      Path to the SQLite DB (default: .jules-subagents/sprint.db)");
    console.log("    --source-id ID      Source ID for the project (default: cli-migration)");
    console.log("    --base-dir DIR      Base directory for the project (default: sprints-dir)");
    console.log("    --dry-run           Preview import without writing to DB");
    console.log("  --help, -h        Show this help message");
    console.log("");
    console.log("Environment Variables:");
    console.log("  JULES_API_KEY     Jules API key");
    console.log("  DASHBOARD_PORT    Port for the dashboard (default: 4444)");
    process.exit(0);
  }

  // Handle migrate-sprints subcommand
  if (args.includes("--migrate-sprints")) {
    const migrateOptions = parseMigrateSprintsArgs(args);
    if (!migrateOptions) {
      console.error("Error: --migrate-sprints requires --sprints-dir <path>");
      process.exit(1);
    }
    try {
      const result = await runMigrateSprintsCommand(migrateOptions);
      printImportResult(result);
      process.exit(0);
    } catch (error) {
      console.error("Migration failed:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
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
