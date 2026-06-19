/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/preact";
import * as matchers from "@testing-library/jest-dom/matchers";
import { DependencyStatusIndicators } from "../DependencyStatusIndicators.js";

expect.extend(matchers);

describe("DependencyStatusIndicators", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders correctly with indicators and corresponding icons", () => {
    const { getByText, container } = render(
      <DependencyStatusIndicators
        indicators={[
          { recordId: "1", id: "TASK-1", title: "Test task 1", status: "completed" },
          { recordId: "2", id: "TASK-2", title: "Test task 2", status: "pending" },
          { recordId: "3", id: "TASK-3", title: "Test task 3", status: "QA_REVIEW_FAILED" }
        ]}
      />
    );

    expect(getByText("TASK-1")).toBeTruthy();
    expect(getByText("TASK-2")).toBeTruthy();
    expect(getByText("TASK-3")).toBeTruthy();

    // Based on the status, specific icons (svg elements) should be rendered.
    // 'completed' uses CheckCircle2, 'pending' uses Clock, 'QA_REVIEW_FAILED' uses AlertCircle.
    // The implementation passes aria-hidden to all of them.
    const hiddenIcons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(hiddenIcons.length).toBe(3);
  });

  it("returns null when no indicators provided", () => {
    const { container } = render(<DependencyStatusIndicators indicators={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
