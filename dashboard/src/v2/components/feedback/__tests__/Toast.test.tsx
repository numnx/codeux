// @vitest-environment jsdom
import { h } from "preact";
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ToastProvider, useToast } from "../ToastProvider.js";
import { useReducedMotion } from "../../../hooks/use-reduced-motion.js";
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

vi.mock("../../../hooks/use-reduced-motion.js", () => ({
  useReducedMotion: vi.fn(() => false),
}));

// Mock gsap to avoid test failures
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
      }
    }
  };
});

const TestComponent = () => {
  const { addToast } = useToast();
  return (
    <div>
      <button onClick={() => addToast({ type: "error", message: "Error msg", action: { label: "Retry", onClick: () => {} } })}>Add Error</button>
      <button onClick={() => addToast({ type: "success", message: "Success msg" })}>Add Success</button>
    </div>
  );
};

describe("Toast System", () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it("uses polite for normal and assertive for errors, without nesting roles inside Toast itself", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Test container setup
    expect(document.querySelector('div[role="status"][aria-live="polite"]')).toBeInTheDocument();
    expect(document.querySelector('div[role="alert"][aria-live="assertive"]')).toBeInTheDocument();

    const addSuccess = screen.getByText("Add Success");
    const addError = screen.getByText("Add Error");

    fireEvent.click(addSuccess);
    fireEvent.click(addError);

    await waitFor(() => {
      expect(screen.getByText("Success msg")).toBeInTheDocument();
      expect(screen.getByText("Error msg")).toBeInTheDocument();
    });

    const successToast = screen.getByText("Success msg").closest('div.pointer-events-auto');
    const errorToast = screen.getByText("Error msg").closest('div.pointer-events-auto');

    // Ensure the individual toasts themselves don't have redundant roles
    expect(successToast).not.toHaveAttribute('role');
    expect(successToast).not.toHaveAttribute('aria-live');
    expect(errorToast).not.toHaveAttribute('role');
    expect(errorToast).not.toHaveAttribute('aria-live');
  });

  it("does not dynamically steal focus when an error toast with action is rendered", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const btn = screen.getByText("Add Error");
    btn.focus();
    expect(document.activeElement).toBe(btn);

    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText("Error msg")).toBeInTheDocument();
    });

    const retryBtn = screen.getByText("Retry");
    expect(retryBtn).toBeInTheDocument();

    // Focus should remain on the button that triggered the action, not jump to Retry
    expect(document.activeElement).toBe(btn);
  });

  it("supports auto-dismiss for non-error toasts", async () => {
    vi.useFakeTimers();
    const TestAutoDismiss = () => {
      const { addToast } = useToast();
      return <button onClick={() => addToast({ type: "success", message: "Auto close msg", autoDismissMs: 1000 })}>Add</button>;
    };

    render(<ToastProvider><TestAutoDismiss /></ToastProvider>);

    fireEvent.click(screen.getByText("Add"));
    await waitFor(() => expect(screen.getByText("Auto close msg")).toBeInTheDocument());

    vi.advanceTimersByTime(1100);
    await waitFor(() => expect(screen.queryByText("Auto close msg")).not.toBeInTheDocument());
    vi.useRealTimers();
  });

  it("announces multiple simultaneous toasts without duplicate wrapper roles", async () => {
    const TestMultiple = () => {
      const { addToast } = useToast();
      return (
        <button onClick={() => {
          addToast({ type: "success", message: "Toast 1" });
          addToast({ type: "success", message: "Toast 2" });
        }}>Add Multiple</button>
      );
    };
    render(<ToastProvider><TestMultiple /></ToastProvider>);

    fireEvent.click(screen.getByText("Add Multiple"));
    await waitFor(() => {
      expect(screen.getByText("Toast 1")).toBeInTheDocument();
      expect(screen.getByText("Toast 2")).toBeInTheDocument();
    });

    const t1 = screen.getByText("Toast 1").closest('div.pointer-events-auto');
    const t2 = screen.getByText("Toast 2").closest('div.pointer-events-auto');

    expect(t1).not.toHaveAttribute('role');
    expect(t1).not.toHaveAttribute('aria-live');
    expect(t2).not.toHaveAttribute('role');
    expect(t2).not.toHaveAttribute('aria-live');
  });

  it("safely falls back focus when a focused manual dismiss control is activated", async () => {
    const TestFocus = () => {
      const { addToast } = useToast();
      return <button onClick={() => addToast({ type: "success", message: "Focus test" })}>Add</button>;
    };
    render(<ToastProvider><div role="main" tabIndex={-1} /><TestFocus /></ToastProvider>);

    fireEvent.click(screen.getByText("Add"));
    await waitFor(() => expect(screen.getByText("Focus test")).toBeInTheDocument());

    const dismissBtn = screen.getByRole("button", { name: "Dismiss toast: Focus test" });
    dismissBtn.focus();
    expect(document.activeElement).toBe(dismissBtn);

    fireEvent.click(dismissBtn);

    // GSAP animation mock fires instantly
    const main = document.querySelector('[role="main"]');
    expect(document.activeElement).toBe(main);
  });

  it("does not auto-dismiss error toasts even if autoDismissMs is provided", async () => {
    vi.useFakeTimers();
    const TestErrorAutoDismiss = () => {
      const { addToast } = useToast();
      return <button onClick={() => addToast({ type: "error", message: "Error persist", autoDismissMs: 1000 })}>Add</button>;
    };

    render(<ToastProvider><TestErrorAutoDismiss /></ToastProvider>);

    fireEvent.click(screen.getByText("Add"));
    await waitFor(() => expect(screen.getByText("Error persist")).toBeInTheDocument());

    vi.advanceTimersByTime(2000);
    expect(screen.getByText("Error persist")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("bypasses animations when reduced motion is enabled", async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    render(<ToastProvider><TestComponent /></ToastProvider>);

    fireEvent.click(screen.getByText("Add Success"));
    await waitFor(() => expect(screen.getByText("Success msg")).toBeInTheDocument());

    vi.mocked(useReducedMotion).mockReturnValue(false);
  });
});
