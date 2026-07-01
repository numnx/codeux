import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createPreviewHostMiddleware } from "../../../src/server/preview-host-middleware.js";
import type { DashboardServerOptions } from "../../../src/server/dashboard-server.js";

describe("preview-host-middleware", () => {
  it("rejects hostile origin for preview control paths with 403", async () => {
    const options = {
      getSprintPreviewSession: vi.fn().mockResolvedValue({
        id: "session-1",
        projectId: "proj-1",
        sprintId: "sprint-1",
        status: "running",
        hostPort: 3000,
      }),
      startSprintPreviewSession: vi.fn(),
      rebuildSprintPreviewSession: vi.fn(),
    } as unknown as DashboardServerOptions;

    const app = express();
    app.use(createPreviewHostMiddleware(options));

    const res = await request(app)
      .post("/_code_ux/preview-start")
      .set("Host", "preview-session-1.localhost:4444")
      .set("Origin", "http://evil.com");

    expect(res.status).toBe(403);
    expect(res.text).toContain("Forbidden");
    expect(res.headers["access-control-allow-origin"]).not.toBe("http://evil.com");
  });

  it("allows same-preview-origin for preview control paths", async () => {
    const options = {
      getSprintPreviewSession: vi.fn().mockResolvedValue({
        id: "session-1",
        projectId: "proj-1",
        sprintId: "sprint-1",
        status: "running",
        hostPort: 3000,
      }),
      startSprintPreviewSession: vi.fn().mockResolvedValue({}),
      rebuildSprintPreviewSession: vi.fn(),
    } as unknown as DashboardServerOptions;

    const app = express();
    app.use(createPreviewHostMiddleware(options));

    const res = await request(app)
      .post("/_code_ux/preview-start")
      .set("Host", "preview-session-1.localhost:4444")
      .set("Origin", "http://preview-session-1.localhost:4444");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://preview-session-1.localhost:4444");
  });

  it("allows dashboard-origin for preview control paths", async () => {
    const options = {
      getSprintPreviewSession: vi.fn().mockResolvedValue({
        id: "session-1",
        projectId: "proj-1",
        sprintId: "sprint-1",
        status: "running",
        hostPort: 3000,
      }),
      startSprintPreviewSession: vi.fn().mockResolvedValue({}),
      rebuildSprintPreviewSession: vi.fn(),
    } as unknown as DashboardServerOptions;

    const app = express();
    app.use(createPreviewHostMiddleware(options));

    const res = await request(app)
      .post("/_code_ux/preview-start")
      .set("Host", "preview-session-1.localhost:4444")
      .set("Origin", "http://localhost:4444");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:4444");
  });
});
