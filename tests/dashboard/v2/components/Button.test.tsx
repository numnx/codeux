import { h } from "preact";
/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);
import { Button } from "../../../../dashboard/src/v2/components/ui/Button";
import { act } from "preact/test-utils";

import { cleanup } from "@testing-library/preact";

describe("Button Async Lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("handles successful async operations, showing pending shimmer and success icon", async () => {
    let resolvePromise: (value?: unknown) => void;
    const asyncAction = vi.fn(() => new Promise((resolve) => {
      resolvePromise = resolve;
    }));

    render(<Button onClick={asyncAction}>Submit</Button>);

    const button = screen.getByRole("button", { name: "Submit" });
    expect(button).toBeInTheDocument();

    // Click triggers pending state
    await act(() => {
      button.click();
    });
    expect(asyncAction).toHaveBeenCalledTimes(1);

    // Button should be disabled and show shimmer/opacity adjustments while pending
    expect(button).toBeDisabled();

    // We can't directly check the absolute positioning easily without test IDs,
    // but we can check if it renders the SVG success Check icon later

    // Resolve the promise
    await act(async () => {
      resolvePromise!();
    });

    // Should now transition to success
    await waitFor(() => {
      // The text opacity is set to 0, but the element is still there
      expect(button.querySelector("svg")).toBeInTheDocument(); // The Check icon
    });
    expect(button).toHaveClass("!bg-status-green");
    expect(button).toHaveClass("!text-white");

    // Fast-forward 1.5s for transient state to clear
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    // Should revert to normal
    await waitFor(() => {
      expect(button).not.toHaveClass("!bg-status-green");
      expect(button).not.toBeDisabled();
    });
  });

  it("handles failed async operations, showing pending shimmer and transient error icon", async () => {
    let rejectPromise: (reason?: any) => void;
    const asyncAction = vi.fn(() => new Promise((_, reject) => {
      rejectPromise = reject;
    }));

    // We don't catch the error in a wrapper because our handleClick is natively tapping into the original promise,
    // so we just return the original promise, and the test act blocks handle the reject locally if needed.
    // Or we catch it explicitly in the promise creation so it doesn't throw unhandled.
    const safeAsyncAction = vi.fn(() => {
      const p = new Promise((_, reject) => {
        rejectPromise = reject;
      });
      // Attach a dummy catch to avoid UnhandledPromiseRejection in node
      p.catch(() => {});
      return p;
    });

    render(<Button onClick={safeAsyncAction}>Submit</Button>);

    const button = screen.getByRole("button", { name: "Submit" });

    await act(() => {
      button.click();
    });
    expect(safeAsyncAction).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    // Reject the promise
    await act(async () => {
      rejectPromise!(new Error("Test error"));
      // Give promise handlers time to settle using fake timer tick
      await Promise.resolve();
    });

    // Should transition to transient error state
    await waitFor(() => {
      expect(button).toHaveClass("!bg-status-red");
      expect(button.querySelector("svg")).toBeInTheDocument(); // The X icon
    });

    // Fast-forward 1.5s for transient state to clear
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    // Should revert to normal
    await waitFor(() => {
      expect(button).not.toHaveClass("!bg-status-red");
      expect(button).not.toBeDisabled();
    });
  });
});
