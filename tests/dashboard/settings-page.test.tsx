/**
 * @vitest-environment jsdom
 */
import { render, screen, cleanup } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ProjectSettingsEditor } from "../../dashboard/src/v2/components/settings/ProjectSettingsEditor.jsx";
import { SettingsPage } from "../../dashboard/src/v2/SettingsPage.js";
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

vi.mock("gsap", () => ({
  default: {
    context: vi.fn((fn) => {
      fn?.();
      return { revert: vi.fn() };
    }),
    set: vi.fn(),
    to: vi.fn((_, config) => {
      config?.onComplete?.();
    }),
    fromTo: vi.fn(),
  },
}));

vi.mock("../../dashboard/src/v2/hooks/use-reduced-motion.js", () => ({
  useReducedMotion: () => true,
}));

vi.mock("../../dashboard/src/v2/components/settings/SettingsContentPanels.js", () => ({
  SettingsContentPanels: () => <div>General settings content</div>,
}));

vi.mock("../../dashboard/src/v2/components/ui/UnsavedChangesModal.js", () => ({
  UnsavedChangesModal: () => null,
}));

vi.mock("../../dashboard/src/v2/hooks/use-settings-page-state.js", async () => {
  const { CATEGORIES, CATEGORY_SEARCH_HINTS } = await import("../../dashboard/src/v2/components/settings/SettingsCategoryRail.js");
  const searchInputRef = { current: null };
  return {
    useSettingsPageState: vi.fn(() => ({
      activeCategory: "general",
      setActiveCategory: vi.fn(),
      activeScope: "system",
      setActiveScope: vi.fn(),
      settingsSearch: "",
      setSettingsSearch: vi.fn(),
      activeCategoryConfig: CATEGORIES[0],
      filteredCategories: CATEGORIES,
      error: null,
      selectedProject: { id: "project-1", name: "Project Alpha" },
      activeDirty: false,
      activeSaving: false,
      loading: false,
      saveMessage: null,
      resettingProject: false,
      handleSave: vi.fn(),
      handleResetProject: vi.fn(),
      showUnsavedModal: false,
      confirmDiscard: vi.fn(),
      cancelDiscard: vi.fn(),
      saveAndLeave: vi.fn(),
      searchInputRef,
    })),
    CATEGORIES,
    CATEGORY_SEARCH_HINTS,
  };
});

describe("ProjectSettingsEditor", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Max Parsing Retries input and passes updates correctly", async () => {
    const mockOnChange = vi.fn();
    const mockSettings = {
      cliWorkflow: {
        maxParsingRetries: 3
      },
      workers: {
        executionMode: "CONTAINERS",
        virtualWorkerProvider: "jules"
      },
      agents: {
        qualityAssurance: {
          enabled: false
        }
      },
      aiProvider: {
        providers: {
          jules: { provider: "jules" }
        }
      },
      git: {},
      memory: {},
      automationInterventions: {},
      ciIntelligence: {},
      sprintLoopSteps: {},
      sprintPreview: {
        enabled: false
      },
      skills: [],
      mcpTools: []
    };

    render(
      <ProjectSettingsEditor
        settings={mockSettings as any}
        onChange={mockOnChange}
      />
    );

    const inputs = screen.getAllByRole("spinbutton");
    const input = inputs.find(i => (i as HTMLInputElement).value === "3");

    expect(input).toBeInTheDocument();

    await userEvent.clear(input!);
    await userEvent.type(input!, "5");

    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
        cliWorkflow: expect.objectContaining({ maxParsingRetries: 5 })
    }));
  });
});

describe("SettingsPage landmarks", () => {
  afterEach(() => {
    cleanup();
  });

  it("exposes one page heading, settings search, category navigation, and active panel landmarks", () => {
    render(<SettingsPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: /settings\s*integration/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /smart find/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /categories/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /general/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /smart find/i })).toBeInTheDocument();
  });
});
