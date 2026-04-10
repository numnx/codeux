/** @jsx h */
// @vitest-environment jsdom
import { h } from "preact";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/preact";
import * as matchers from "@testing-library/jest-dom/matchers";
import { SearchOverlay } from "../../../../dashboard/src/v2/components/search/SearchOverlay";

expect.extend(matchers);

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
}));

const mockResults = {
    sprints: [{ id: "spr-1", title: "SPR-1: Design Phase" }],
    tasks: [{ id: "tsk-1", title: "Setup API", sprint: "spr-1" }],
    agents: [{ id: "agt-1", title: "Review Agent" }],
    containers: [{ id: "cnt-1", title: "Preview UI" }],
};

describe("SearchOverlay Interaction", () => {

beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("focuses input on open", async () => {
        const onClose = vi.fn();
        render(<SearchOverlay isOpen={true} onClose={onClose} searchQuery="" onSearchChange={vi.fn()} results={mockResults} />);

        await waitFor(() => {
            const input = screen.getByPlaceholderText(/Search/i);
            expect(document.activeElement).toBe(input);
        });
    });

    it("closes on Escape", async () => {
        const onClose = vi.fn();
        render(<SearchOverlay isOpen={true} onClose={onClose} searchQuery="" onSearchChange={vi.fn()} results={mockResults} />);

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });

    it("navigates down and up and selects on Enter", async () => {
        const onClose = vi.fn();
        // searchQuery must be non-empty to show results
        render(<SearchOverlay isOpen={true} onClose={onClose} searchQuery="a" onSearchChange={vi.fn()} results={mockResults} />);

        // Items length is 4
        // Press Down -> focuses first item (sprint)
        fireEvent.keyDown(window, { key: 'ArrowDown' });
        // Press Down -> focuses second item (task)
        fireEvent.keyDown(window, { key: 'ArrowDown' });

        // Press Enter
        fireEvent.keyDown(window, { key: 'Enter' });

        expect(mockNavigate).toHaveBeenCalledWith({ to: "/tasks", search: { sprint: "spr-1" } });
        expect(onClose).toHaveBeenCalled();
    });

    it("selects agent and navigates correctly via click", async () => {
        const onClose = vi.fn();
        render(<SearchOverlay isOpen={true} onClose={onClose} searchQuery="agent" onSearchChange={vi.fn()} results={mockResults} />);

        const agentOption = screen.getByRole('option', { name: /Review Agent/i });
        fireEvent.click(agentOption);

        expect(mockNavigate).toHaveBeenCalledWith({ to: "/agents" });
        expect(onClose).toHaveBeenCalled();
    });

    it("restores focus after closing", async () => {
        const button = document.createElement("button");
        document.body.appendChild(button);
        button.focus();

        const { rerender } = render(<SearchOverlay isOpen={true} onClose={vi.fn()} searchQuery="" onSearchChange={vi.fn()} results={mockResults} />);

        rerender(<SearchOverlay isOpen={false} onClose={vi.fn()} searchQuery="" onSearchChange={vi.fn()} results={mockResults} />);

        await waitFor(() => {
            expect(document.activeElement).toBe(button);
        });

        document.body.removeChild(button);
    });
});
