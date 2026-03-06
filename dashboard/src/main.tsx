import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { App as LegacyApp } from "./legacy-app.js";
import { DashboardV2 } from "./v2/DashboardV2.js";
import { SprintsPage } from "./v2/SprintsPage.js";
import { KineticDock } from "./v2/components/KineticDock.js";
import { TopNav } from "./v2/components/TopNav.js";
import "./styles.css";

// 1. Root Route: Holds the Layout
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
      <div className="flex flex-col h-screen overflow-hidden font-sans text-slate-900 dark:text-slate-200 bg-[#F9F8F4] dark:bg-void-900 transition-colors duration-700">
        {/* Subtle warm ambient — no more indigo splash */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_-10%_-10%,_rgba(0,224,160,0.04)_0%,_transparent_60%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_-10%_-10%,_rgba(0,224,160,0.06)_0%,_transparent_60%)] transition-colors duration-1000" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_110%_110%,_rgba(255,184,0,0.03)_0%,_transparent_60%)] dark:bg-[radial-gradient(ellipse_60%_40%_at_110%_110%,_rgba(255,184,0,0.05)_0%,_transparent_60%)] transition-colors duration-1000" />
        </div>

        {/* Main App Canvas */}
        <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
          <TopNav isDark={isDark} toggleTheme={toggleTheme} />

          {/* Page Content */}
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

// 4. Live Route — renders the legacy dashboard for the selected project
const liveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/live',
  component: LegacyApp,
});

// 5. Router
const routeTree = rootRoute.addChildren([indexRoute, sprintsRoute, liveRoute]);

const router = createRouter({ routeTree });

const Root = () => {
  const [legacyHash, setLegacyHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setLegacyHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (legacyHash === "#legacy") {
    return <LegacyApp />;
  }

  return <RouterProvider router={router} />;
};

const container = document.getElementById("app");
if (!container) {
  throw new Error("Dashboard root element '#app' not found");
}

render(<Root />, container);
