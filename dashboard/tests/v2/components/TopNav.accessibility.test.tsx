import { fireEvent } from "@testing-library/preact";
vi.mock("../../../src/v2/components/NotificationPanel.js", () => ({ NotificationPanel: () => <div role="dialog" aria-label="Notifications">Panel</div> }));
/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { createContext } from "preact";

const mockProjectDataContext = createContext({});
let mockProjectData = {
    projects: [
        { id: "proj-1", name: "Project Alpha", status: "idle" },
        { id: "proj-2", name: "Project Beta", status: "idle" }
    ],
    selectedProject: { id: "proj-1", name: "Project Alpha", status: "idle" },
    loading: false,
    createProject: vi.fn().mockResolvedValue(undefined),
    selectProject: vi.fn().mockResolvedValue(undefined),
};

// Mock required contexts and hooks
vi.mock("../../../src/v2/context/project-data.js", () => {
    return {
        ProjectDataContext: createContext({}),
        useProjectData: () => mockProjectData
    };
});

let mockSprintsData = {
    data: [
        { id: "spr-1", name: "Sprint 1", number: 1, status: "idle" },
        { id: "spr-2", name: "Sprint 2", number: 2, status: "idle" }
    ],
    selectedSprintId: "spr-1",
    selectedSprint: { id: "spr-1", name: "Sprint 1", number: 1, status: "idle" },
    loading: false,
    selectSprint: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../../../src/hooks/useSprints.js", () => ({
    useSprints: () => mockSprintsData
}));

vi.mock("../../../src/v2/hooks/use-project-effective-settings.js", () => ({
    useProjectEffectiveSettings: () => ({
        data: { settings: { git: { sprintKeyPrefix: "SPR" }, sprintPreview: { enabled: true, showInAppBrowser: true } } },
        effectiveSettings: { settings: { sprintPreview: { enabled: true, showInAppBrowser: true } } }
    })
}));

vi.mock("../../../src/v2/hooks/use-notifications.js", () => ({
    useNotifications: () => ({
        notifications: [],
        unreadCount: 0,
        markAllRead: vi.fn(),
        markRead: vi.fn(),
        dismiss: vi.fn(),
        refresh: vi.fn(),
    })
}));

vi.mock("../../../src/v2/hooks/use-is-dark.js", () => ({
    useIsDark: () => false
}));

// Mock GSAP to prevent errors during rendering
vi.mock("gsap", () => ({
    default: {
        fromTo: vi.fn(),
        to: vi.fn(),
        set: vi.fn(),
        context: vi.fn(() => ({ revert: vi.fn() })),
        killTweensOf: vi.fn(),
        timeline: vi.fn()
    },
    gsap: {
        fromTo: vi.fn(),
        to: vi.fn(),
        set: vi.fn(),
        context: vi.fn(() => ({ revert: vi.fn() })),
        killTweensOf: vi.fn(),
        timeline: vi.fn()
    }
}));

// Mock Router link
vi.mock("@tanstack/react-router", () => ({
    Link: ({ children, to = "#", ...props }: any) => <a href={to} {...props}>{children}</a>
}));

vi.mock("../../../src/v2/components/top-nav/GlobalSearch.js", () => ({
    GlobalSearch: () => <div data-testid="global-search">Search</div>
}))

vi.mock("../../../src/v2/components/top-nav/BrandSection.js", () => ({
    BrandSection: ({ isMobileMenuOpen }: any) => <div data-testid="brand-section" data-open={String(!!isMobileMenuOpen)}>Brand</div>
}))

vi.mock("../../../src/v2/components/top-nav/TelemetryStats.js", () => ({
    TelemetryStats: () => <div data-testid="telemetry-stats">Stats</div>
}))

vi.mock("../../../src/v2/components/DockerStatusMenu.js", () => ({
    DockerStatusMenu: () => <div data-testid="docker-status">Docker</div>
}))

vi.mock("../../../src/v2/components/browser/BrowserSessionsMenu.js", () => ({
    BrowserSessionsMenu: () => <div data-testid="browser-sessions">Browser</div>
}))

// Mock the hook last
vi.mock("../../../src/v2/hooks/useThemeSetting.js", () => ({
    useThemeSetting: () => ({ theme: 'system', setTheme: vi.fn() }),
    ThemeProvider: ({ children }: any) => <div>{children}</div>
}));

import { TopNav } from "../../../src/v2/components/TopNav.js";
import { TitleBar } from "../../../src/v2/components/TitleBar.js";
import { ThemeProvider } from "../../../src/v2/hooks/useThemeSetting.js";

expect.extend(matchers);

describe("TopNav Selectors Accessibility", () => {
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(() => {
        user = userEvent.setup();
        mockSprintsData = {
            data: [
                { id: "spr-1", name: "Sprint 1", number: 1, status: "idle" },
                { id: "spr-2", name: "Sprint 2", number: 2, status: "idle" }
            ],
            selectedSprintId: "spr-1",
            selectedSprint: { id: "spr-1", name: "Sprint 1", number: 1, status: "idle" },
            loading: false,
            selectSprint: vi.fn().mockResolvedValue(undefined),
        };
        mockProjectData = {
            projects: [
                { id: "proj-1", name: "Project Alpha", status: "idle" },
                { id: "proj-2", name: "Project Beta", status: "idle" }
            ],
            selectedProject: { id: "proj-1", name: "Project Alpha", status: "idle" },
            loading: false,
            createProject: vi.fn().mockResolvedValue(undefined),
            selectProject: vi.fn().mockResolvedValue(undefined),
        };
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    const renderNav = () => {
        return render(
            <ThemeProvider>
                <TopNav />
            </ThemeProvider>
        );
    };

    it("has accessible names and aria-expanded on selector buttons", async () => {
        renderNav();
        const projectBtn = document.getElementById("project-selector-button");
        const sprintBtn = document.getElementById("sprint-selector-button");

        expect(projectBtn).toHaveAttribute("aria-expanded", "false");
        expect(sprintBtn).toHaveAttribute("aria-expanded", "false");

        expect(projectBtn).toHaveAttribute("aria-controls", "project-listbox");
        expect(sprintBtn).toHaveAttribute("aria-controls", "sprint-listbox");
    });

    it("can open project dropdown with keyboard", async () => {
        renderNav();
        const projectBtn = document.getElementById("project-selector-button") as HTMLButtonElement;

        projectBtn.focus();
        await user.keyboard("{Enter}");

        expect(projectBtn).toHaveAttribute("aria-expanded", "true");

        const listbox = screen.getByRole("listbox", { name: /Project list/i });
        expect(listbox).toBeInTheDocument();
    });

    it("can filter projects and keeps aria-selected updated", async () => {
        renderNav();
        const projectBtn = document.getElementById("project-selector-button") as HTMLButtonElement;

        projectBtn.focus();
        await user.keyboard("{Enter}");

        const filterInput = screen.getByRole("textbox", { name: /Filter projects/i });
        expect(filterInput).toHaveAttribute("aria-controls", "project-listbox");

        // Before filtering, we have two options
        expect(screen.getAllByRole("option")).toHaveLength(2);

        const alphaOption = screen.getByRole("option", { name: /Project Alpha/i });
        expect(alphaOption).toHaveAttribute("aria-selected", "true");

        const betaOption = screen.getByRole("option", { name: /Project Beta/i });
        expect(betaOption).toHaveAttribute("aria-selected", "false");

        // Type to filter
        await user.type(filterInput, "Beta");

        expect(screen.getAllByRole("option")).toHaveLength(1);
        expect(screen.getByRole("option", { name: /Project Beta/i })).toBeInTheDocument();
        expect(screen.queryByRole("option", { name: /Project Alpha/i })).not.toBeInTheDocument();
    });

    it("restores focus to selector button on Escape", async () => {
        renderNav();

        const projectBtn = document.getElementById("project-selector-button") as HTMLButtonElement;

        projectBtn.focus();
        await user.keyboard("{Enter}");

        expect(screen.getByRole("listbox", { name: /Project list/i })).toBeInTheDocument();

        await user.keyboard("{Escape}");

        // Let setTimeout run for focus restoration
        await new Promise(r => setTimeout(r, 0));

        expect(document.activeElement).toBe(projectBtn);
    });

    it("supports Home and End keyboard navigation in dropdown", async () => {
        renderNav();
        const projectBtn = document.getElementById("project-selector-button") as HTMLButtonElement;

        projectBtn.focus();
        await user.keyboard("{Enter}");

        // Wait for focus
        await new Promise(r => setTimeout(r, 0));

        // Ensure options are there
        const options = screen.getAllByRole("option");
        expect(options).toHaveLength(2);

        await user.keyboard("{End}");
        expect(document.activeElement).toBe(screen.getByText("Manage Projects").closest("a"));

        await user.keyboard("{Home}");
        // Focus should move to the filter input actually, because it's focusable
        const input = screen.getByRole("textbox");
        expect(document.activeElement).toBe(input);
    });

    it("announces selected state in aria-label", async () => {
        renderNav();
        const projectBtn = document.getElementById("project-selector-button");
        expect(projectBtn).toHaveAttribute("aria-label", "Project selector, selected project: Project Alpha");

        const sprintBtn = document.getElementById("sprint-selector-button");
        expect(sprintBtn?.getAttribute("aria-label")).toMatch(/^Sprint selector, selected sprint:/);
    });

    it("can select an option using keyboard", async () => {
        renderNav();
        const projectBtn = document.getElementById("project-selector-button") as HTMLButtonElement;

        projectBtn.focus();
        await user.keyboard("{Enter}");

        const betaOption = screen.getByRole("option", { name: /Project Beta/i });
        betaOption.focus();
        await user.keyboard("{Enter}");

        // Let promises resolve
        await new Promise(r => setTimeout(r, 0));

        expect(projectBtn).toHaveAttribute("aria-expanded", "false");
    });

    it("announces sprint disabled state appropriately when no sprints", async () => {
        mockSprintsData.data = [];
        mockSprintsData.selectedSprintId = null;
        mockSprintsData.selectedSprint = null;

        renderNav();
        const sprintBtn = document.getElementById("sprint-selector-button") as HTMLButtonElement;

        expect(sprintBtn).toHaveAttribute("aria-disabled", "true");
        expect(sprintBtn).toBeDisabled();
        await user.click(sprintBtn);
        expect(sprintBtn).toHaveAttribute("aria-expanded", "false");
    });

    it("marks selector triggers busy during loading states", () => {
        mockProjectData.loading = true;
        mockSprintsData.loading = true;
        mockSprintsData.data = [];
        mockSprintsData.selectedSprintId = null;
        mockSprintsData.selectedSprint = null;

        renderNav();

        const projectBtn = document.getElementById("project-selector-button");
        const sprintBtn = document.getElementById("sprint-selector-button") as HTMLButtonElement;

        expect(projectBtn).toHaveAttribute("aria-busy", "true");
        expect(projectBtn).toHaveAccessibleName("Project selector, selected project: Project Alpha");
        expect(sprintBtn).toHaveAttribute("aria-busy", "true");
        expect(sprintBtn).toHaveAccessibleName("Sprint selector, loading sprints");
        expect(sprintBtn).toBeDisabled();
    });


    it("supports notification menu Escape close", async () => {
        renderNav();
        const notifyBtn = screen.getByRole("button", { name: /Notifications/i });

        fireEvent.click(notifyBtn);
        // wait a tick
        await new Promise(r => setTimeout(r, 10));
        expect(notifyBtn).toHaveAttribute("aria-expanded", "true");

        notifyBtn.focus();
        await user.keyboard("{Escape}");
        fireEvent.keyDown(document, { key: "Escape" });
        // Let setTimeout run for focus restoration
        await new Promise(r => setTimeout(r, 50));

        expect(notifyBtn).toHaveAttribute("aria-expanded", "false");
        expect(document.activeElement).toBe(notifyBtn);
    });

    it("includes current state in theme toggle naming", async () => {
        renderNav();
        const themeBtn = screen.getByRole("button", { name: /Current theme:/i });
        expect(themeBtn).toHaveAttribute("aria-label", expect.stringContaining("Light"));
    });

});

describe("TitleBar Accessibility", () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("names Electron window controls and removes them from draggable regions", async () => {
        const windowApi = {
            minimize: vi.fn().mockResolvedValue(undefined),
            toggleMaximize: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
            getState: vi.fn().mockResolvedValue({ isMaximized: false, isFullScreen: false, platform: "win32" }),
            onStateChange: vi.fn(() => vi.fn()),
        };
        vi.stubGlobal("__APP_VERSION__", "test");
        vi.stubGlobal("codeUxDesktop", undefined);
        Object.defineProperty(window, "codeUxDesktop", {
            configurable: true,
            value: { platform: "win32", window: windowApi },
        });

        render(<TitleBar />);

        const minimize = screen.getByRole("button", { name: "Minimize window" });
        const maximize = screen.getByRole("button", { name: "Maximize window" });
        const close = screen.getByRole("button", { name: "Close window" });

        expect(minimize).toHaveClass("titlebar-no-drag");
        expect(maximize).toHaveClass("titlebar-no-drag");
        expect(close).toHaveClass("titlebar-no-drag");
        expect(minimize.className).toContain("focus-visible:ring-2");
        expect(maximize.className).toContain("focus-visible:ring-2");
        expect(close.className).toContain("focus-visible:ring-2");
    });
});
