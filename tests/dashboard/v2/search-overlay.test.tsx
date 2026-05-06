/** @jsx h */
// @vitest-environment happy-dom
import { h } from "preact";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/preact";
import * as matchers from "@testing-library/jest-dom/matchers";
import { SearchOverlay } from "../../../dashboard/src/v2/components/search/SearchOverlay.js";

expect.extend(matchers);

vi.mock("../../../dashboard/src/v2/lib/motion/index.js", () => ({
    useReducedMotion: () => true,
}));

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(() => mockNavigate),
}));

describe("SearchOverlay", () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    const mockResults = {
        sprints: [
            { id: "sprint-1", title: "SPR-1: First Sprint", status: "active" },
        ],
        tasks: [
            { id: "task-1", title: "First Task", sprint: "sprint-1", status: "open" },
        ],
        agents: [],
        containers: []
    };

    it("renders search overlay and supports keyboard navigation", async () => {
        const onClose = vi.fn();
        render(
            <SearchOverlay
                isOpen={true}
                onClose={onClose}
                searchQuery="first"
                onSearchChange={() => {}}
                results={mockResults}
                isLoading={false}
            />
        );

        const input = screen.getByPlaceholderText("Search sprints, tasks, agents...");
        expect(input).toBeInTheDocument();

        // Initially no item selected, arrow down selects first item
        fireEvent.keyDown(window, { key: "ArrowDown" });

        const options = screen.getAllByRole("option");
        expect(options).toHaveLength(2);

        expect(options[0]).toHaveAttribute("aria-selected", "true");
        expect(options[1]).toHaveAttribute("aria-selected", "false");

        // Arrow down again
        fireEvent.keyDown(window, { key: "ArrowDown" });
        expect(options[0]).toHaveAttribute("aria-selected", "false");
        expect(options[1]).toHaveAttribute("aria-selected", "true");

        // Arrow down wraps around
        fireEvent.keyDown(window, { key: "ArrowDown" });
        expect(options[0]).toHaveAttribute("aria-selected", "true");
        expect(options[1]).toHaveAttribute("aria-selected", "false");

        // Arrow up wraps around to last item
        fireEvent.keyDown(window, { key: "ArrowUp" });
        expect(options[0]).toHaveAttribute("aria-selected", "false");
        expect(options[1]).toHaveAttribute("aria-selected", "true");

        // Enter selects item
        fireEvent.keyDown(window, { key: "Enter" });
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/tasks", search: { taskId: "task-1" } });
        expect(onClose).toHaveBeenCalled();
    });

    it("restores focus when closed", async () => {
        const button = document.createElement("button");
        document.body.appendChild(button);
        button.focus();

        const { rerender } = render(
            <SearchOverlay
                isOpen={true}
                onClose={() => {}}
                searchQuery=""
                onSearchChange={() => {}}
                results={mockResults}
                isLoading={false}
            />
        );

        await waitFor(() => {
            expect(document.activeElement).not.toBe(button);
        });

        rerender(
            <SearchOverlay
                isOpen={false}
                onClose={() => {}}
                searchQuery=""
                onSearchChange={() => {}}
                results={mockResults}
                isLoading={false}
            />
        );

        await waitFor(() => {
            expect(document.activeElement).toBe(button);
        });

        document.body.removeChild(button);
    });

    it("closes on Escape key and correctly checks defaultPrevented", async () => {
        const onClose = vi.fn();
        render(
            <SearchOverlay
                isOpen={true}
                onClose={onClose}
                searchQuery=""
                onSearchChange={() => {}}
                results={mockResults}
                isLoading={false}
            />
        );

        const escapeEvent = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
        Object.defineProperty(escapeEvent, 'defaultPrevented', { value: false });
        window.dispatchEvent(escapeEvent);
        expect(onClose).toHaveBeenCalledTimes(1);

        // Should not close if default is prevented
        const preventedEscape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
        Object.defineProperty(preventedEscape, 'defaultPrevented', { value: true });
        window.dispatchEvent(preventedEscape);
        expect(onClose).toHaveBeenCalledTimes(1); // Still 1
    });
});
