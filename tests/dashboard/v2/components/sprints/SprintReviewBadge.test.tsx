import { cleanup } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => { cleanup(); });
/** @jsx h */
/** @vitest-environment happy-dom */
import { h } from "preact";
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { SprintReviewBadge } from "../../../../../dashboard/src/v2/components/sprints/SprintReviewBadge";

describe("SprintReviewBadge", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const openReviewOverlay = async () => {
    const trigger = screen.getByLabelText("QA review details");
    fireEvent.mouseEnter(trigger.parentElement as Element);
    await waitFor(() => {
      expect(screen.getByText("QA Review Complete")).toBeDefined();
    });
  };

  it("renders running state loading UI", () => {
    const summary = {
      status: "running",
      outcome: null,
      summary: null,
      findings: [],
      reviewer: null,
      finishedAt: null,
    };
    render(<SprintReviewBadge summary={summary} />);
    expect(screen.getByText("Reviewing...")).toBeDefined();
  });

  it("renders completed review without findings", async () => {
    const summary = {
      status: "completed",
      outcome: "passed",
      summary: "Looks perfect.",
      findings: [],
      reviewer: "Jules",
      finishedAt: "2024-01-01T00:00:00.000Z",
    };
    render(<SprintReviewBadge summary={summary} />);
    await openReviewOverlay();
    expect(screen.getByText("Looks perfect.")).toBeDefined();
    expect(screen.getByText("Reviewed by Jules")).toBeDefined();

    // Should not render the findings toggle button
    expect(screen.queryByText(/View \d+ Findings/)).toBeNull();
  });

  it("renders completed review with findings in a two-column layout", async () => {
    const summary = {
      status: "completed",
      outcome: "passed",
      summary: "Good but has minor nits.",
      findings: ["Fix spacing", "Rename variable"],
      reviewer: "Jules",
      finishedAt: "2024-01-01T00:00:00.000Z",
    };
    render(<SprintReviewBadge summary={summary} />);

    await openReviewOverlay();

    // Ensure the header for findings is rendered
    expect(screen.getByText("2 Findings")).toBeDefined();

    // Verify findings are present in the DOM (right column content)
    expect(screen.getByText("Fix spacing")).toBeDefined();
    expect(screen.getByText("Rename variable")).toBeDefined();
  });

  it("positions the overlay beside the review icon", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function getRect() {
      const element = this as HTMLElement;
      if (element.getAttribute("aria-label") === "QA review details") {
        return {
          x: 120,
          y: 80,
          top: 80,
          left: 120,
          right: 136,
          bottom: 96,
          width: 16,
          height: 16,
          toJSON: () => ({}),
        } as DOMRect;
      }
      if (element.getAttribute("role") === "tooltip") {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 320,
          bottom: 180,
          width: 320,
          height: 180,
          toJSON: () => ({}),
        } as DOMRect;
      }
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      } as DOMRect;
    });

    const summary = {
      status: "completed",
      outcome: "passed",
      summary: "Looks perfect.",
      findings: [],
      reviewer: "Jules",
      finishedAt: "2024-01-01T00:00:00.000Z",
    };
    render(<SprintReviewBadge summary={summary} align="left" />);

    await openReviewOverlay();

    const overlay = screen.getByRole("tooltip");
    await waitFor(() => {
      expect(overlay.style.left).toBe("146px");
    });
  });
});
