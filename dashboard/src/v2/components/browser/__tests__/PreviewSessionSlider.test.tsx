/**
 * @vitest-environment happy-dom
 */
import { render, screen, fireEvent } from "@testing-library/preact";
import { describe, it, expect, vi } from "vitest";
import { PreviewSessionSlider } from "../PreviewSessionSlider.jsx";
import "@testing-library/jest-dom/vitest";
import type { SprintPreviewSession } from "../../../../types.js";

describe("PreviewSessionSlider", () => {
  const mockSessions: SprintPreviewSession[] = [
    {
      id: "session-1",
      sprintId: "sprint-1",
      sprintName: "Test Sprint",
      projectName: "proj-1",
      sprintNumber: 1,
      hostPort: 3000,
      containerAppPort: 3000,
      containerSystemPort: 3001,
      containerId: "container-1",
      status: "running",
      healthStatus: "healthy",
      lastKnownPath: "/",
      createdAt: "",
      updatedAt: "",
      startupScriptPath: "",
      containerIp: "",
      imageName: "",
      projectId: "proj-1"
    } as any,
  ];

  it("renders correctly", () => {
    render(
      <PreviewSessionSlider
        sessions={mockSessions}
        selectedSessionId={null}
        onSelectSession={vi.fn()}
        onRemoveSession={vi.fn()}
      />
    );

    expect(screen.getByText("Test Sprint")).toBeInTheDocument();
    expect(screen.getByLabelText("Health: healthy")).toBeInTheDocument();
    expect(screen.getByLabelText("Status: running")).toBeInTheDocument();
  });

  it("disables remove button and shows aria-busy when removing", () => {
    render(
      <PreviewSessionSlider
        sessions={mockSessions}
        selectedSessionId={null}
        onSelectSession={vi.fn()}
        onRemoveSession={vi.fn()}
        removingSessionIds={["session-1"]}
      />
    );

    const removeBtn = screen.getByRole("button", { name: /Removing\.\.\./i });
    expect(removeBtn).toBeDisabled();
    expect(removeBtn).toHaveAttribute("aria-busy", "true");
  });
});
