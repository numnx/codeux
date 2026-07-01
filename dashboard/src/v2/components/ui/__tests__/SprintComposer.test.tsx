/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { SprintComposer } from "../SprintComposer.js";
import { ExecutionTimelineProvider } from "../../../../hooks/ExecutionTimelineContext.js";
import "@testing-library/jest-dom/vitest";

const renderWithContext = (ui: any) => {
  return render(
    <ExecutionTimelineProvider execution={null}>
      {ui}
    </ExecutionTimelineProvider>
  );
};

describe("SprintComposer", () => {
  const defaultProps = {
    nextId: "SPRINT-1",
    virtualProviders: [],
    planningPresets: [],
    planningEta: 5000,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    onImprovePrompt: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("fails validation and sets hasAttemptedSubmit without shaking under reduced motion", async () => {
    // Override window.matchMedia for reduced motion
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }) as any);

    const { container } = renderWithContext(<SprintComposer {...defaultProps} />);
    const submitBtn = screen.getByRole("button", { name: "Plan ahead with AI" });

    const input = screen.getByRole("textbox", { name: "Sprint Name" });
    await userEvent.clear(input);
    await userEvent.click(submitBtn);

    expect(screen.getByText("Sprint name is required")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");

    // Test that the form-shake class is not applied due to reduced motion
    expect(input).not.toHaveClass("animate-form-shake");
  });

  it("fails validation and sets hasAttemptedSubmit WITH shaking under normal motion", async () => {
    // Override window.matchMedia for normal motion
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }) as any);

    renderWithContext(<SprintComposer {...defaultProps} />);
    const submitBtn = screen.getByRole("button", { name: "Plan ahead with AI" });

    const input = screen.getByRole("textbox", { name: "Sprint Name" });
    await userEvent.clear(input);
    await userEvent.click(submitBtn);

    expect(screen.getByText("Sprint name is required")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");

    // Test that the form-shake class IS applied due to normal motion
    expect(input).toHaveClass("animate-form-shake");
  });

  it("handles very long sprint names and goals without throwing layout errors", async () => {
    renderWithContext(<SprintComposer {...defaultProps} />);
    const input = screen.getByRole("textbox", { name: "Sprint Name" });
    const goalInput = screen.getByPlaceholderText(/Describe the outcome/);
    fireEvent.input(input, { target: { value: "A very long sprint name ".repeat(20) } });
    fireEvent.input(goalInput, { target: { value: "A very long sprint goal ".repeat(50) } });
    expect(screen.getByRole("button", { name: "Plan ahead with AI" })).toBeInTheDocument();
  });

  it("shows retry failure and prompt-improve pending states", async () => {
    const improvePromptMock = vi.fn().mockRejectedValue(new Error("Network failure"));
    renderWithContext(<SprintComposer {...defaultProps} onImprovePrompt={improvePromptMock} />);

    const input = screen.getByRole("textbox", { name: "Sprint Name" });
    const goalInput = screen.getByPlaceholderText(/Describe the outcome/);

    fireEvent.input(input, { target: { value: "A new sprint" } });
    fireEvent.input(goalInput, { target: { value: "A new goal" } });

    const improveBtn = screen.getByRole("button", { name: "Plan ahead with AI" });
    fireEvent.click(improveBtn);

    // Expect to see the pending message
    await waitFor(() => {
        expect(screen.getAllByText("Refining prompt...").length).toBeGreaterThan(0);
    });

    // Expect to see the error message after rejection
    await waitFor(() => {
        expect(screen.queryAllByText("Network failure").length).toBeGreaterThan(0);
        expect(screen.queryByRole("button", { name: "Retry Improve" })).not.toBeNull();
    }, { timeout: 3000 });
  });

  it("cancels pending requests, updates aria-busy correctly, and prevents duplicate submissions", async () => {
    let resolveImprove: any;
    let isCanceled = false;
    const improvePromise = new Promise((res, rej) => {
        resolveImprove = res;
    });

    const improvePromptMock = vi.fn().mockImplementation((args) => {
        // mock to support signal
        if (args.signal) {
            args.signal.addEventListener('abort', () => { isCanceled = true; });
        }
        return improvePromise;
    });

    const onCancelMock = vi.fn();
    renderWithContext(<SprintComposer {...defaultProps} onImprovePrompt={improvePromptMock} onCancelPlanningRequest={onCancelMock} />);

    const input = screen.getByRole("textbox", { name: "Sprint Name" });
    const goalInput = screen.getByPlaceholderText(/Describe the outcome/);

    fireEvent.input(input, { target: { value: "A new sprint" } });
    fireEvent.input(goalInput, { target: { value: "A new goal" } });

    const improveBtn = screen.getByRole("button", { name: "Plan ahead with AI" });
    const formContainer = input.closest('form');
    expect(formContainer).not.toHaveAttribute('aria-busy', 'true');

    fireEvent.click(improveBtn);

    // Form should immediately become busy and improveBtn should disable to prevent double clicks
    expect(formContainer).toHaveAttribute('aria-busy', 'true');
    expect(improveBtn).toBeDisabled();

    // Trigger another click while disabled to prove double submit is prevented (handled by HTML disabled attribute but good to assert)
    fireEvent.click(improveBtn);
    expect(improvePromptMock).toHaveBeenCalledTimes(1);

    // Overlay is active, cancel it
    await waitFor(() => {
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    const cancelBtn = screen.getAllByRole("button", { name: "Cancel Active Request" })[0];
    fireEvent.click(cancelBtn);

    expect(onCancelMock).toHaveBeenCalled();
    expect(isCanceled).toBe(true);

    // Ensure form is released and error message is populated about cancellation
    await waitFor(() => {
        expect(formContainer).not.toHaveAttribute('aria-busy', 'true');
        expect(screen.getByText("Planning request cancelled.")).toBeInTheDocument();
    });
  });

  it("handles successful completions and restores focus", async () => {
    const improvePromptMock = vi.fn().mockResolvedValue("Improved text");
    const { container } = renderWithContext(<SprintComposer {...defaultProps} onImprovePrompt={improvePromptMock} />);

    const input = screen.getByRole("textbox", { name: "Sprint Name" });
    const goalInput = screen.getByPlaceholderText(/Describe the outcome/);

    fireEvent.input(input, { target: { value: "A new sprint" } });
    fireEvent.input(goalInput, { target: { value: "A new goal" } });

    const improveBtn = screen.getByRole("button", { name: "Plan ahead with AI" });
    // Keep focus on the button to check if it restores
    improveBtn.focus();
    fireEvent.click(improveBtn);

    const formContainer = input.closest('form');
    expect(formContainer).toHaveAttribute('aria-busy', 'true');

    await waitFor(() => {
        expect(formContainer).not.toHaveAttribute('aria-busy', 'true');
    }, { timeout: 3000 });

    // Ensure focus is restored to the previous element
    await waitFor(() => {
        expect(document.activeElement).toBe(improveBtn);
    });
  });

});
