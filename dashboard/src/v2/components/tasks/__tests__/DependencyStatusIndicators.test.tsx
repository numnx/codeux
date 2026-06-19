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

  it("renders correctly with indicators", () => {
    const { getByText, container } = render(
      <DependencyStatusIndicators
        indicators={[
          { recordId: "1", id: "TASK-1", title: "Test task 1", status: "completed" },
          { recordId: "2", id: "TASK-2", title: "Test task 2", status: "pending" }
        ]}
      />
    );

    // Verify visual text exists (aria-hidden)
    const task1Elements = container.querySelectorAll('span[aria-hidden="true"]');
    expect(Array.from(task1Elements).some(el => el.textContent === "TASK-1")).toBeTruthy();

    // Verify sr-only accessible text
    const srText = getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'span' && element?.className.includes('sr-only') && content.includes('Depends on task TASK-1');
    });
    expect(srText).toBeTruthy();
  });

  it("returns null when no indicators provided", () => {
    const { container } = render(<DependencyStatusIndicators indicators={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
