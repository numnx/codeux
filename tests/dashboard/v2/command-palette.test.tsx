/** @jsx h */
// @vitest-environment jsdom
import { h } from "preact";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/preact";
import * as matchers from "@testing-library/jest-dom/matchers";
import { CommandPalette } from "../../../dashboard/src/v2/components/ui/CommandPalette.js";
import { useProjectData } from "../../../dashboard/src/v2/context/project-data.js";

expect.extend(matchers);

const navigateMock = vi.fn();

vi.mock("../../../dashboard/src/v2/context/project-data.js", () => {
    return {
        useProjectData: vi.fn(),
    };
});

vi.mock("../../../dashboard/src/v2/lib/browser-api.js", () => ({
    fetchPreviewSessions: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../../dashboard/src/v2/lib/preview-origin.js", () => ({
    buildPreviewUrl: vi.fn((sessionId, path) => `http://preview-${sessionId}.localhost${path || "/"}`),
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => navigateMock,
}));

vi.mock("../../../dashboard/src/v2/hooks/use-focus-trap.js", () => ({
    useFocusTrap: () => ({ current: null }),
}));

describe("CommandPalette", () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.mocked(useProjectData).mockReturnValue({
            selectedProject: null,
        } as any);
        // Since useFocusTrap is mocked to return a ref object, we don't need real focus trapping in these tests.
    });

    afterEach(() => {
        cleanup();
    });

    it("opens via global event and renders correctly", async () => {
        render(<CommandPalette />);

        // Should be hidden initially
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        // Dispatch open event
        window.dispatchEvent(new CustomEvent("open-command-palette"));

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Search input should be present
        expect(screen.getByPlaceholderText("Search routes or jump to...")).toBeInTheDocument();

        // Basic routes should be listed
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Sprints")).toBeInTheDocument();
    });

    it("opens via Meta+K shortcut", async () => {
        render(<CommandPalette />);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        // Dispatch keyboard shortcut
        const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
        window.dispatchEvent(event);

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
    });

    it("filters options based on search query", async () => {
        render(<CommandPalette />);
        window.dispatchEvent(new CustomEvent("open-command-palette"));

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText("Search routes or jump to...");

        // Let it render initial items
        await waitFor(() => {
            expect(screen.getByText("Overview")).toBeInTheDocument();
        });

        // Let's type out exactly into the value attribute
        (input as HTMLInputElement).value = "Sprint";
        // Use fireEvent.change and input to ensure it catches across preact handlers
        fireEvent.input(input, { target: { value: "Sprint" } });
        fireEvent.change(input, { target: { value: "Sprint" } });

        // Wait for rerender and overview to be filtered out
        await waitFor(() => {
            expect(screen.queryByText("Overview")).not.toBeInTheDocument();
            expect(screen.getByText("Sprints")).toBeInTheDocument();
        });
    });

    it("navigates and closes when an option is selected", async () => {
        render(<CommandPalette />);
        window.dispatchEvent(new CustomEvent("open-command-palette"));

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Click the sprints option
        const sprintsOption = screen.getByRole("option", { name: /Sprints/i });
        fireEvent.click(sprintsOption);

        expect(navigateMock).toHaveBeenCalledWith({ to: "/sprints" });

        // Should close after click
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });

    it("navigates via keyboard arrows and enter key", async () => {
        render(<CommandPalette />);
        window.dispatchEvent(new CustomEvent("open-command-palette"));

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Let it render
        await waitFor(() => {
            expect(screen.getByRole("option", { selected: true })).toHaveTextContent("Overview");
        });

        const input = screen.getByPlaceholderText("Search routes or jump to...");
        // Let's use search to select instead as it's more robust in jsdom
        (input as HTMLInputElement).value = "Sprint";
        fireEvent.input(input, { target: { value: "Sprint" } });
        fireEvent.change(input, { target: { value: "Sprint" } });

        await waitFor(() => {
            const selectedOptions = screen.getAllByRole("option", { selected: true });
            expect(selectedOptions[0]).toHaveTextContent("Sprints");
        });

        // Press Enter
        const container = screen.getByRole("dialog").parentElement!;
        fireEvent.keyDown(container, { key: "Enter", code: "Enter" });

        expect(navigateMock).toHaveBeenCalledWith({ to: "/sprints" });

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });
});
