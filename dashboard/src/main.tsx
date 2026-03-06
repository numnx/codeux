import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
  useRouterState
} from "@tanstack/react-router";
import { App as LegacyApp } from "./legacy-app.js";
import { DashboardV2 } from "./v2/DashboardV2.js";
import { SprintsPage } from "./v2/SprintsPage.js";
import { KineticDock } from "./v2/components/KineticDock.js";
import { TopNav } from "./v2/components/TopNav.js";
import { CanvasBackground } from "./v2/components/CanvasBackground.js";
import "./styles.css";

// 1. Root Route: Holds the Layout (Background, TopNav, KineticDock)
const rootRoute = createRootRoute({
  component: () => {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
      const root = window.document.documentElement;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }, [isDark]);

    const toggleTheme = () => setIsDark(!isDark);

    return (
      <div className="flex flex-col h-screen overflow-hidden font-outfit text-slate-900 dark:text-slate-200 bg-slate-50 dark:bg-[#030303] transition-colors duration-700">
        {/* Background Grid & Splash */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent dark:from-indigo-500/10 transition-colors duration-1000" />
        </div>

        {/* Main App Canvas */}
        <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
          <TopNav isDark={isDark} toggleTheme={toggleTheme} />

          {/* Page Content Rendered Here */}
          <div className="flex-1 overflow-y-auto dashboard-scrollbar relative pb-32">
            <Outlet />
          </div>
        </div>

        {/* Floating Navigation Dock */}
        <KineticDock />
      </div>
    );
  }
});

// 2. Index Route (Overview)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardV2,
});

// 3. Sprints Route
const sprintsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sprints',
  component: SprintsPage,
});

// 4. Create the router tree
const routeTree = rootRoute.addChildren([indexRoute, sprintsRoute]);

const router = createRouter({ routeTree });

const Root = () => {
  const [legacyHash, setLegacyHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setLegacyHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Intercept legacy route
  if (legacyHash === "#legacy") {
    return <LegacyApp />;
  }

  // Render TanStack Router
  return <RouterProvider router={router} />;
};

const container = document.getElementById("app");
if (!container) {
  throw new Error("Dashboard root element '#app' not found");
}

render(<Root />, container);
