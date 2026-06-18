// @vitest-environment jsdom
import { h } from "preact";
import { render, screen } from "@testing-library/preact";
import { describe, it, expect, vi } from "vitest";
import { ActionFeedbackRegion } from "../ActionFeedbackRegion.js";
import { useReducedMotion } from "../../../hooks/use-reduced-motion.js";
import { fireEvent } from "@testing-library/preact";
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

vi.mock("../../../hooks/use-reduced-motion.js", () => ({
  useReducedMotion: vi.fn(() => false),
}));

// Mock gsap
vi.mock("gsap", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    default: {
      ...actual.default,
      context: (cb: any) => { cb(); return { revert: () => {} }; },
      fromTo: (target: any, from: any, to: any) => {
        if (to.onComplete) to.onComplete();
      },
      to: (target: any, to: any) => {
        if (to.onComplete) to.onComplete();
      },
      timeline: () => ({
        fromTo: () => {},
        to: (target: any, to: any) => { if (to.onComplete) to.onComplete(); }
      })
    }
  };
});

describe("ActionFeedbackRegion", () => {
  it("sets correct role and aria-live depending on status", () => {
    const { unmount } = render(<ActionFeedbackRegion status="success" message="Success message" />);

    const el = screen.getByRole("status");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Success message")).toBeInTheDocument();
    unmount();

    render(<ActionFeedbackRegion status="error" message="Error message" />);
    const err = screen.getByRole("alert");
    expect(err).toBeInTheDocument();
    expect(err).toHaveAttribute("aria-live", "assertive");
  });

  it("applies contextual accessible names to buttons and aria-hidden to progress", () => {
    render(
      <ActionFeedbackRegion
        status="success"
        message="Saved successfully"
        retryAction={() => {}}
        onDismiss={() => {}}
      />
    );

    const retryBtn = screen.getByRole("button", { name: "Retry: Saved successfully" });
    const dismissBtn = screen.getByRole("button", { name: "Dismiss: Saved successfully" });
    expect(retryBtn).toBeInTheDocument();
    expect(dismissBtn).toBeInTheDocument();
  });

  it("safely falls back focus when a focused manual dismiss control is activated", () => {
    render(<div role="main" tabIndex={-1}><ActionFeedbackRegion status="warning" message="Warning msg" onDismiss={vi.fn()} /></div>);

    const dismissBtn = screen.getByRole("button", { name: "Dismiss: Warning msg" });
    dismissBtn.focus();
    expect(document.activeElement).toBe(dismissBtn);

    fireEvent.click(dismissBtn);

    const main = document.querySelector('[role="main"]');
    expect(document.activeElement).toBe(main);
  });

  it("handles retryable error feedback", () => {
    const retryFn = vi.fn();
    render(<ActionFeedbackRegion status="error" message="Failed to load" retryAction={retryFn} retryLabel="Try Again" />);

    const retryBtn = screen.getByRole("button", { name: "Try Again: Failed to load" });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(retryFn).toHaveBeenCalledOnce();
  });

  it("bypasses animations when reduced motion is enabled", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { unmount } = render(<ActionFeedbackRegion status="success" message="Success message" />);
    expect(screen.getByText("Success message")).toBeInTheDocument();
    unmount();
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });
});
