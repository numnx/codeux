/** @jsx h */
/** @vitest-environment happy-dom */
import { h } from "preact";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/preact";
import { SprintCell } from "../../../dashboard/src/v2/components/sprints/SprintCell";
import { ORGANIC_CELL_SHADOW_CLASS } from "../../../dashboard/src/v2/components/ui/organic-cell-styles";

afterEach(() => { cleanup(); });

describe("SprintCell DOM structure for Verification", () => {
  const defaultSprint = {
    id: "sprint-1",
    projectId: "proj-1",
    name: "Feature Alpha",
    goal: "Build Alpha",
    slug: "alpha",
    status: "idle" as const,
    tasksCount: 5,
    completion: 0,
    showcasePinned: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  it("uses the shared organic project-cell shadow underlay", () => {
    const { container } = render(<SprintCell sprint={defaultSprint} isEven={true} accentColor="text-blue-500" />);
    const mainDiv = container.firstChild as HTMLDivElement;
    const shadowShell = container.querySelector("[data-organic-cell-shadow]");

    expect(mainDiv.className).not.toContain("hover:shadow-");
    expect(shadowShell).toBeTruthy();
    expect(shadowShell?.className.toString()).toContain(ORGANIC_CELL_SHADOW_CLASS);
    expect(shadowShell?.className.toString()).not.toContain("drop-shadow");
    expect(shadowShell?.className.toString()).toContain("animate-organic");
  });

  it("maintains consistent structural dimensions and shadow when quotaWait is applied", () => {
    const futureTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const quotaWait = {
      sprintId: "sprint-1",
      retryAfterIso: futureTime,
      taskCount: 1,
      taskKey: "TASK-1",
      taskTitle: "Do work",
    };

    const { container } = render(<SprintCell sprint={defaultSprint} isEven={true} accentColor="text-blue-500" quotaWait={quotaWait} />);
    const mainDiv = container.firstChild as HTMLDivElement;

    // Outer shell should still have standard dimensions
    expect(mainDiv.className).toContain("h-72 w-72");
    expect(mainDiv.className).toContain("lg:h-80 lg:w-80");

    // The organic shadow must remain intact to prevent visual gaps in the gallery grid
    const shadowShell = container.querySelector("[data-organic-cell-shadow]");
    expect(shadowShell).toBeTruthy();
    expect(shadowShell?.className.toString()).toContain(ORGANIC_CELL_SHADOW_CLASS);
  });
});
