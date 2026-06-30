/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { h } from "preact";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

// The actual issue is that `dashboard/src/main.tsx` throws when executed at the top level
// because it expects the DOM to be ready and `document.getElementById('app')` to exist.
// Vitest runs `import` statements before *any* code in this file executes!
// To fix this, we must configure a global setup or dynamically import the module inside `it`
// after manually creating the div. We also must ensure `vi.mock` runs before dynamic import.

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...mod,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  };
});

// We must mock preact to prevent main.tsx from aggressively mounting into our testing DOM
vi.mock("preact", async (importOriginal) => {
  const mod = await importOriginal<typeof import("preact")>();
  return {
    ...mod,
    render: (vnode: any, parent: any) => {
      if (parent && parent.id === "app") return; // intercept initial shell mount
      return mod.render(vnode, parent);
    }
  };
});

vi.mock("../../../../dashboard/src/v2/components/KineticDock.js", () => ({ KineticDock: () => <div /> }));
vi.mock("../../../../dashboard/src/v2/components/layout/Sidebar.js", () => ({ Sidebar: () => <div /> }));
vi.mock("../../../../dashboard/src/v2/components/TopNav.js", () => ({ TopNav: () => <div /> }));
vi.mock("../../../../dashboard/src/v2/components/TitleBar.js", () => ({ TitleBar: () => <div /> }));
vi.mock("../../../../dashboard/src/v2/components/onboarding/OnboardingExperience.js", () => ({ OnboardingExperience: () => <div /> }));
vi.mock("../../../../dashboard/src/v2/components/onboarding/GuidedDashboardTour.js", () => ({ GuidedDashboardTour: () => <div /> }));
vi.mock("../../../../dashboard/src/v2/context/project-data.js", () => ({
  useProjectData: () => ({ selectedProject: null }),
  ProjectDataProvider: ({ children }: any) => <div>{children}</div>,
  ProjectDataContext: {}
}));
vi.mock("../../../../dashboard/src/v2/hooks/use-project-effective-settings.js", () => ({
  useProjectEffectiveSettings: () => ({ settings: null, error: null, isLoading: false })
}));
vi.mock("../../../../dashboard/src/v2/lib/settings-api.js", () => ({
  fetchSystemSettings: vi.fn(),
}));

describe("App Shell Layout", () => {
  it("exposes exactly one main landmark and a functional skip link", async () => {
    // 1. Manually construct DOM
    if (!document.getElementById("app")) {
      const root = document.createElement("div");
      root.id = "app";
      document.body.appendChild(root);
    }

    // 2. Dynamically import the module NOW
    const { AppLayout } = await import("../../../../dashboard/src/main.js");

    const { container, getByText } = render(<AppLayout />);

    const mainLandmarks = container.querySelectorAll("main");
    expect(mainLandmarks.length).toBe(1);
    expect(mainLandmarks[0]).toHaveAttribute("id", "main-content");
    expect(mainLandmarks[0]).toHaveAttribute("role", "main");

    const skipLink = getByText("Skip to main content");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");

    const user = userEvent.setup();
    const focusSpy = vi.spyOn(mainLandmarks[0], "focus");
    await user.click(skipLink);

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });
});
