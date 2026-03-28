/** @jsx h */
// @vitest-environment jsdom
import { h } from "preact";
import { render, screen, cleanup } from "@testing-library/preact";
import * as matchers from "@testing-library/jest-dom/matchers";
import { describe, it, expect, vi, beforeEach } from "vitest";

expect.extend(matchers);

// Mock hooks before importing LiveSessionPage
vi.mock("../../../dashboard/src/v2/hooks/use-dashboard-runtime-data.js", () => ({
  useDashboardRuntimeData: vi.fn(() => ({
    error: null,
    execution: { projectId: "project-1", sprintRuns: [] },
    gitStatus: null,
    gitStatusError: null,
    initialLoadComplete: true,
    refreshRuntimeStatus: vi.fn(),
    refreshGitStatus: vi.fn(),
    status: {},
    tasksWithLiveActivities: [],
  })),
}));

vi.mock("../../../dashboard/src/v2/hooks/useSprints.js", () => ({
  useSprints: vi.fn(() => ({ data: [], selectedSprintId: "sprint-1", loading: false })),
}));

vi.mock("../../../dashboard/src/v2/context/project-data.js", () => ({
  useProjectData: vi.fn(() => ({ projects: [], selectedProjectId: "project-1" })),
}));

vi.mock("../../../dashboard/src/v2/hooks/use-project-tasks.js", () => ({
  useProjectTasks: vi.fn(() => ({ tasks: [], loading: false })),
}));

// Mock ResizeObserver for components that might use it
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock preview sessions hook to control session return value
const usePreviewSessionsMock = vi.fn();
vi.mock("../../../dashboard/src/v2/hooks/use-preview-sessions.js", () => ({
  usePreviewSessions: (...args: any[]) => usePreviewSessionsMock(...args),
}));

// Import LiveSessionPage after mocks
import { LiveSessionPage } from "../../../dashboard/src/v2/LiveSessionPage.js";
import type { SprintPreviewSession } from "../../../src/contracts/app-types.js";

describe("LiveSessionPage - LivePreviewLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("should render live preview link when a running session exists with hostPort", () => {
    const runningSession: SprintPreviewSession = {
      id: "sess-123",
      projectId: "project-1",
      sprintId: "sprint-1",
      projectName: "Test Project",
      sprintName: "Sprint 1",
      sprintNumber: 1,
      status: "running",
      hostPort: 3000,
      containerAppPort: 3000,
      containerId: "container-123",
      lastKnownPath: "/test-path",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    usePreviewSessionsMock.mockReturnValue({
      selectedSession: runningSession,
    });

    render(<LiveSessionPage />);

    // The link should be present with text 'Live Preview'
    const link = screen.getByRole("link", { name: /Live Preview/i });
    expect(link).toBeInTheDocument();

    // Check href attribute contains preview origin and path
    expect(link.getAttribute("href")).toContain("preview-sess-123");
    expect(link.getAttribute("href")).toContain("/test-path");
  });

  it("should not render live preview link when no session exists", () => {
    usePreviewSessionsMock.mockReturnValue({
      selectedSession: null,
    });

    render(<LiveSessionPage />);

    const link = screen.queryByRole("link", { name: /Live Preview/i });
    expect(link).toBeNull();
  });

  it("should not render live preview link when session is not running", () => {
    const stoppedSession: SprintPreviewSession = {
      id: "sess-123",
      projectId: "project-1",
      sprintId: "sprint-1",
      projectName: "Test Project",
      sprintName: "Sprint 1",
      sprintNumber: 1,
      status: "stopped",
      hostPort: 3000,
      containerAppPort: 3000,
      containerId: null,
      lastKnownPath: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    usePreviewSessionsMock.mockReturnValue({
      selectedSession: stoppedSession,
    });

    render(<LiveSessionPage />);

    const link = screen.queryByRole("link", { name: /Live Preview/i });
    expect(link).toBeNull();
  });

  it("should not render live preview link when session has no hostPort", () => {
    const noPortSession: SprintPreviewSession = {
      id: "sess-123",
      projectId: "project-1",
      sprintId: "sprint-1",
      projectName: "Test Project",
      sprintName: "Sprint 1",
      sprintNumber: 1,
      status: "running",
      hostPort: null,
      containerAppPort: 3000,
      containerId: "container-123",
      lastKnownPath: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    usePreviewSessionsMock.mockReturnValue({
      selectedSession: noPortSession,
    });

    render(<LiveSessionPage />);

    const link = screen.queryByRole("link", { name: /Live Preview/i });
    expect(link).toBeNull();
  });
});
