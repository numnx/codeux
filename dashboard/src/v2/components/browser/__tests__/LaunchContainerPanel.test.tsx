/**
 * @vitest-environment happy-dom
 */
import { render, screen } from "@testing-library/preact";
import { describe, it, expect, vi } from "vitest";
import { LaunchContainerPanel } from "../LaunchContainerPanel.jsx";
import "@testing-library/jest-dom/vitest";

import type { Sprint } from "../../../types.js";

describe("LaunchContainerPanel", () => {

  const mockSprints: Sprint[] = [
    { id: "sprint-1", name: "Sprint 1", projectId: "proj-1", status: "live" as any, createdAt: "", updatedAt: "", date: "", number: 1, slug: "", originalPrompt: "", title: "", activeTaskCount: 0, pendingTaskCount: 0, blockedTaskCount: 0, errorTaskCount: 0, completedTaskCount: 0, meta: {} } as any,
  ];

  it("renders correctly with active state", () => {
    render(
      <LaunchContainerPanel
        sprints={mockSprints}
        launchSprintId="sprint-1"
        onLaunchSprintChange={vi.fn()}
        onLaunchContainer={vi.fn()}
        launchEnabled={true}
        launchBusy={false}
      />
    );

    const button = screen.getByRole("button", { name: /Launch Container/i });
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute("aria-busy", "true");
  });

  it("shows busy state correctly", () => {
    render(
      <LaunchContainerPanel
        sprints={mockSprints}
        launchSprintId="sprint-1"
        onLaunchSprintChange={vi.fn()}
        onLaunchContainer={vi.fn()}
        launchEnabled={true}
        launchBusy={true}
      />
    );

    const button = screen.getByRole("button", { name: /Starting/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("shows disabled when launchEnabled is false", () => {
    render(
      <LaunchContainerPanel
        sprints={mockSprints}
        launchSprintId="sprint-1"
        onLaunchSprintChange={vi.fn()}
        onLaunchContainer={vi.fn()}
        launchEnabled={false}
        launchBusy={false}
      />
    );

    const button = screen.getByRole("button", { name: /Unavailable/i });
    expect(button).toBeDisabled();
  });
});
