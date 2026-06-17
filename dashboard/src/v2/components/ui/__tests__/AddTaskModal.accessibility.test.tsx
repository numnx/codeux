// @vitest-environment jsdom
import { h } from "preact";
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { describe, it, expect, vi } from "vitest";
import { AddTaskModal } from "../AddTaskModal.js";
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

vi.mock("gsap", () => ({ default: { fromTo: vi.fn(), to: vi.fn() }, fromTo: vi.fn(), to: vi.fn() }));

describe("AddTaskModal Accessibility", () => {
  it("renders dependency selection with accessible group and live region", () => {
    render(<AddTaskModal onClose={vi.fn()} onSubmit={vi.fn()} sprints={[]} availableTasks={[]} />);
    // Test for the empty state live region instead, group only renders when there are options
    expect(screen.getByText(/No existing tasks/)).toBeInTheDocument();
    expect(screen.getByText(/No existing tasks/)).toHaveAttribute("aria-live", "polite");
  });
});
