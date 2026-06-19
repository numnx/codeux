/** @vitest-environment happy-dom */
/** @jsx h */
import { h } from "preact";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/preact";
import * as matchers from "@testing-library/jest-dom/matchers";
import { DashboardV2 } from "../../../dashboard/src/v2/DashboardV2.js";

expect.extend(matchers);

vi.mock("gsap", () => ({
  default: {
    context: vi.fn((fn) => {
      fn?.();
      return { revert: vi.fn() };
    }),
    set: vi.fn(),
    fromTo: vi.fn(),
  },
}));

vi.mock("../../../dashboard/src/v2/hooks/use-reduced-motion.js", () => ({
  useReducedMotion: () => true,
}));

vi.mock("../../../dashboard/src/v2/hooks/use-overview-page-data.js", () => ({
  useOverviewPageData: () => ({
    sprints: [],
    tasks: [],
    execution: { sprintRuns: [], taskDispatches: [], recentEvents: [] },
    selectedProject: { id: "project-1", name: "Project Alpha" },
    isLoading: false,
  }),
}));

vi.mock("../../../dashboard/src/v2/components/HeaderStats.js", () => ({
  HeaderStats: () => <div>Header stats</div>,
}));

vi.mock("../../../dashboard/src/v2/components/SourcesGrid.js", () => ({
  SourcesGrid: ({ headingId }: { headingId?: string }) => (
    <div>
      <h2 id={headingId}>Projects & Sources</h2>
      <div>Project Alpha</div>
    </div>
  ),
}));

vi.mock("../../../dashboard/src/v2/components/TasksList.js", () => ({
  TasksList: ({ headingId }: { headingId?: string }) => (
    <div>
      <h2 id={headingId}>Active Streams</h2>
      <div role="list" />
    </div>
  ),
}));

vi.mock("../../../dashboard/src/v2/components/OverviewTelemetry.js", () => ({
  OverviewTelemetry: () => <div>Telemetry</div>,
}));

describe("DashboardV2 semantics", () => {
  it("exposes one page heading and named overview landmarks", async () => {
    render(<DashboardV2 />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /cluster metrics/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /projects & sources/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /active streams/i })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /live telemetry/i })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /cluster status: optimal/i })).toBeInTheDocument();
  });
});
