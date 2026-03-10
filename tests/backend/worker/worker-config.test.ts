import { describe, expect, it } from "vitest";
import { loadWorkerConfig } from "../../../src/worker/worker-config.js";

describe("loadWorkerConfig", () => {
  it("builds worker-host server defaults", () => {
    const config = loadWorkerConfig(["node", "worker.js"]);

    expect(config.connectionKey).toContain("worker:");
    expect(config.displayName).toContain("Sprint OS Worker");
    expect(config.serverCommand).toBe(process.execPath);
    expect(config.serverArgs).toContain("--runtime-role");
    expect(config.serverArgs).toContain("worker-host");
  });

  it("parses explicit worker flags", () => {
    const config = loadWorkerConfig([
      "node",
      "worker.js",
      "--connection-key",
      "worker-1",
      "--display-name=CI Worker",
      "--project-id",
      "project-1",
      "--sprint-id",
      "sprint-1",
      "--dispatch-poll-interval-ms",
      "2000",
      "--session-poll-interval-ms",
      "3000",
      "--server-command",
      "node",
      "--server-arg",
      "dist/index.js",
      "--server-arg=--runtime-role",
      "--server-arg",
      "worker-host",
      "--server-cwd",
      "/tmp/sprint-os",
    ]);

    expect(config.connectionKey).toBe("worker-1");
    expect(config.displayName).toBe("CI Worker");
    expect(config.projectId).toBe("project-1");
    expect(config.sprintId).toBe("sprint-1");
    expect(config.dispatchPollIntervalMs).toBe(2000);
    expect(config.sessionPollIntervalMs).toBe(3000);
    expect(config.serverCommand).toBe("node");
    expect(config.serverArgs).toEqual(["dist/index.js", "--runtime-role", "worker-host"]);
    expect(config.serverCwd).toBe("/tmp/sprint-os");
  });
});
