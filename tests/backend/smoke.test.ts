import { describe, it, expect } from "vitest";
import * as path from "path";
import { fileURLToPath } from "url";
import { JulesAgentServer } from "../../src/server/jules-agent-server.js";
import { loadAppConfig } from "../../src/config/app-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Smoke Test", () => {
  it("should initialize JulesAgentServer without crashing", () => {
    // Use the actual project root
    const projectRoot = path.resolve(__dirname, "../../");
    
    // Mock argv to avoid interference with the test runner
    const argv = ["node", "dist/index.js"];
    
    const appConfig = loadAppConfig(argv, projectRoot);
    
    // This should not throw the TypeError reported by the user
    const server = new JulesAgentServer({ projectRoot, appConfig });
    
    expect(server).toBeDefined();
  });
});
