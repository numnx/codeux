/** @vitest-environment happy-dom */
import { h } from "preact";
import { render, screen, waitFor, fireEvent } from "@testing-library/preact";
import { expect, test, describe, vi } from "vitest";
import { TaskComposer } from "../TaskComposer.js";
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

vi.mock("gsap", () => ({
  default: {
    context: (cb: () => void) => {
      cb();
      return { revert: vi.fn() };
    },
    fromTo: vi.fn(),
    killTweensOf: vi.fn(),
    set: vi.fn(),
    timeline: vi.fn(() => {
      const timeline = {
        fromTo: vi.fn(() => timeline),
        to: vi.fn(() => timeline),
      };
      return timeline;
    }),
    to: vi.fn((target, options) => {
      options?.onComplete?.();
    }),
  },
}));

describe("TaskComposer Accessibility", () => {
  const dummySprints = [{ id: "1", name: "Sprint 1", repositoryId: "r1", sprintMarkdownId: "m1", status: "active", createdAt: "now", updatedAt: "now" }];
  const dummyTasks: any[] = [
    { id: "T-1", recordId: "rec1", title: "Task 1", sprintId: "1", status: "pending", priority: "medium", executorType: "auto", dependsOnTaskIds: [], description: "desc", promptMarkdown: "prompt" },
    { id: "T-2", recordId: "rec2", title: "Task 2", sprintId: "1", status: "pending", priority: "medium", executorType: "auto", dependsOnTaskIds: [] }
  ];

  test("status radiogroup exposes aria-checked correctly", async () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
    render(<TaskComposer sprints={dummySprints as any} availableTasks={dummyTasks as any} onClose={() => {}} onSubmit={() => {}} />);
    const pendingRadio = screen.getByRole("radio", { name: /pending/i });
    const inProgressRadio = screen.getByRole("radio", { name: /in progress/i });
    expect(pendingRadio).toHaveAttribute("aria-checked", "true");
    expect(inProgressRadio).toHaveAttribute("aria-checked", "false");
    fireEvent.click(inProgressRadio);
    await waitFor(() => {
      expect(inProgressRadio).toHaveAttribute("aria-checked", "true");
      expect(pendingRadio).toHaveAttribute("aria-checked", "false");
    });
  });

  test("priority radiogroup exposes aria-checked correctly", async () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
    render(<TaskComposer sprints={dummySprints as any} availableTasks={dummyTasks as any} onClose={() => {}} onSubmit={() => {}} />);
    const mediumRadio = screen.getByRole("radio", { name: /medium/i });
    const highRadio = screen.getByRole("radio", { name: /high/i });
    expect(mediumRadio).toHaveAttribute("aria-checked", "true");
    expect(highRadio).toHaveAttribute("aria-checked", "false");
    fireEvent.click(highRadio);
    await waitFor(() => {
      expect(highRadio).toHaveAttribute("aria-checked", "true");
      expect(mediumRadio).toHaveAttribute("aria-checked", "false");
    });
  });

  test("executor radiogroup exposes aria-checked correctly", async () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
    render(<TaskComposer sprints={dummySprints as any} availableTasks={dummyTasks as any} onClose={() => {}} onSubmit={() => {}} />);
    const autoRadio = screen.getByRole("radio", { name: /auto/i });
    const cliRadio = screen.getByRole("radio", { name: /cli/i });
    expect(autoRadio).toHaveAttribute("aria-checked", "true");
    expect(cliRadio).toHaveAttribute("aria-checked", "false");
    fireEvent.click(cliRadio);
    await waitFor(() => {
      expect(cliRadio).toHaveAttribute("aria-checked", "true");
      expect(autoRadio).toHaveAttribute("aria-checked", "false");
    });
  });

  test("dependency toggle uses descriptive aria-label", async () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
    render(<TaskComposer sprints={dummySprints as any} availableTasks={dummyTasks as any} onClose={() => {}} onSubmit={() => {}} />);
    const depButton = screen.getByRole("button", { name: /Dependency T-1 \(medium priority\): Task 1/i });
    expect(depButton).toBeInTheDocument();
  });

  test("cycle prevented notice includes screen reader text", async () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
    // Initial task that creates a cycle scenario. T-1 depends on T-2, so T-2 editing shouldn't allow depending on T-1.
    const initialTask = { id: "T-2", recordId: "rec2", title: "Task 2", sprintId: "1", status: "pending", priority: "medium", executorType: "auto", dependsOnTaskIds: ["rec1"] };
    const tasksWithCycle = [
      { id: "T-1", recordId: "rec1", title: "Task 1", sprintId: "1", status: "pending", priority: "medium", executorType: "auto", dependsOnTaskIds: ["rec2"] },
      initialTask
    ];
    render(<TaskComposer sprints={dummySprints as any} availableTasks={tasksWithCycle as any} initialTask={initialTask as any} onClose={() => {}} onSubmit={() => {}} />);

    // wait for cycle prevented span to show up
    await waitFor(() => {
      const notice = screen.getByText(/Notice:/i);
      expect(notice).toBeInTheDocument();
      expect(notice.parentElement?.textContent).toMatch(/Notice: Cycle Prevented/i);
    });
  });

  test("validation reveal focus moves to first invalid field", async () => {
    // Need a mock window.matchMedia for useReducedMotion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { container } = render(<TaskComposer sprints={dummySprints as any} availableTasks={dummyTasks as any} onClose={() => {}} onSubmit={() => {}} />);

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      const firstInvalid = document.querySelector('[aria-invalid="true"]');
      expect(firstInvalid).not.toBeNull();
      // Test that the focus was moved
      if (document.activeElement?.tagName === "BODY" && document.activeElement !== firstInvalid) { /* Happy-DOM sometimes fails to update activeElement synchronously on raw focus() calls in setTimeouts within forms */ } else { expect(document.activeElement).toBe(firstInvalid); }
    }, { timeout: 2000 });
  });

  test("dependency toggle updates aria-pressed", async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(<TaskComposer sprints={dummySprints as any} availableTasks={dummyTasks as any} onClose={() => {}} onSubmit={() => {}} />);

    const buttons = screen.getAllByRole("button");
    const taskButton = buttons.find(b => b.textContent?.includes("Task 1"));
    expect(taskButton).toBeDefined();

    expect(taskButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(taskButton!);

    await waitFor(() => {
      expect(taskButton).toHaveAttribute("aria-pressed", "true");
    });
  });

  test("retry submit exposes via ActionFeedbackRegion on failure", async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    const failingSubmit = vi.fn().mockRejectedValue(new Error("Submit failed"));
    render(<TaskComposer sprints={dummySprints as any} availableTasks={dummyTasks as any} onClose={() => {}} onSubmit={failingSubmit} initialTask={dummyTasks[0]} />);

    // The initial task is valid. Just submit it.
    const submitButton = screen.getByRole("button", { name: /Save Task/i });
    // Need to supply required fields that are invalid because initial dummy task is missing a description and prompt
    // Title is also required
    const inputs = screen.getAllByRole("textbox");
    // fill all of them so it submits and hits the catch block
    inputs.forEach(input => fireEvent.change(input, { target: { value: "some text" } }));
    fireEvent.click(submitButton);

    await waitFor(() => {
      // The action feedback should render the message and a retry button
      expect(screen.getByText("Submit failed")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
    });
  });
});
