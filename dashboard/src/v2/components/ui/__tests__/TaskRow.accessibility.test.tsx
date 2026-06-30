// @vitest-environment jsdom
import { expect, test, describe, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { TaskRow } from "../TaskRow.js";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

describe("TaskRow Accessibility", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    const mockTask = {
        recordId: "rec_1",
        id: "TASK-1234",
        title: "Implement new feature",
        priority: "high" as const,
        status: "in_progress" as const,
        assignee: "Alice",
        source: "github",
        executorType: "jules",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sprintId: "spr_1",
        time: "5m 20s"
    };

    test("quick actions have accessible names containing the task title and state", () => {
        render(<TaskRow task={mockTask as any} onPlayStop={() => {}} />);

        // Stop/Rerun button
        const stopBtn = screen.getByRole('button', { name: /Stop task TASK-1234: Implement new feature \(in progress\)/i });
        expect(stopBtn).toBeInTheDocument();

        // Configure link
        const configureLink = screen.getByRole('link', { name: /Configure task TASK-1234: Implement new feature \(in progress\)/i });
        expect(configureLink).toBeInTheDocument();

        // Live session link
        const liveLink = screen.getByRole('link', { name: /Open live session for task TASK-1234: Implement new feature \(in progress\)/i });
        expect(liveLink).toBeInTheDocument();
    });

    test("quick actions container is keyboard accessible and visible on focus within", async () => {
        const user = userEvent.setup();
        const { container } = render(<TaskRow task={mockTask as any} onPlayStop={() => {}} />);

        // By default, it's not focused. The container has group-focus-within:opacity-100
        const actionsContainer = screen.getByRole('button', { name: /Stop task TASK-1234/i }).parentElement;
        expect(actionsContainer).toHaveClass('group-focus-within:opacity-100');

        // Tab into the row
        await user.tab();
        const firstFocusable = container.querySelector('button, a');
        expect(firstFocusable).toHaveFocus();
    });

    test("does not contain aria-live regions on the row level", () => {
        const { container } = render(<TaskRow task={mockTask as any} onPlayStop={() => {}} />);
        const liveRegions = container.querySelectorAll('[aria-live]');
        expect(liveRegions.length).toBe(0);
    });
});
