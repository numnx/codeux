/** @jsx h */
/** @vitest-environment happy-dom */
import { h } from "preact";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/preact";
import * as matchers from "@testing-library/jest-dom/matchers";
import { SprintLedger } from "../../../dashboard/src/v2/components/sprints/SprintLedger.js";
import type { Sprint } from "../../../dashboard/src/types.js";

expect.extend(matchers);

vi.mock("../../../dashboard/src/v2/lib/list-window.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    resolveListWindow: vi.fn(() => 50),
  };
});

const sprint: Sprint = {
  id: "sprint-1",
  projectId: "project-1",
  number: 1,
  slug: "mobile",
  name: "Mobile Readability Sprint",
  originalPrompt: null,
  goal: "Ensure ledger remains readable on narrow viewports.",
  status: "running",
  showcasePinned: false,
  startDate: null,
  endDate: null,
  featureBranch: null,
  tasksCount: 3,
  completion: 45,
  createdAt: "2026-05-31T00:00:00.000Z",
  updatedAt: "2026-05-31T00:00:00.000Z",
  date: "May 31",
};

describe("SprintLedger responsive rows", () => {
  it("renders mobile field labels so key row data stays readable", () => {
    render(
      <SprintLedger
        sprints={[sprint]}
        isLoading={false}
        listWindow="all"
        onListWindowChange={vi.fn()}
        activeRunsBySprintId={new Map([["sprint-1", { id: "run-1", status: "running" }]])}
        pauseResumeRunsBySprintId={new Map([["sprint-1", { id: "run-1", status: "running" }]])}
        interventionBySprintId={new Map()}
        pendingActionIds={new Set()}
        onToggleShowcase={vi.fn()}
        onSprintToggle={vi.fn()}
        onSprintPauseResume={vi.fn()}
        onOpenRowMenu={vi.fn()}
        onBulkStart={vi.fn()}
        onBulkDelete={vi.fn()}
        onBulkShowcaseEnable={vi.fn()}
        onBulkShowcaseDisable={vi.fn()}
      />
    );

    expect(screen.getAllByText("Sprint ID").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Completion").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Controls").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Pause" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Stop" }).length).toBeGreaterThan(0);
  });
});
