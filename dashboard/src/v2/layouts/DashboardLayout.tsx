import { lazy, Suspense } from "preact/compat";
import { Outlet } from "@tanstack/react-router";
import { KineticDock } from "../components/KineticDock.js";
import { Sidebar } from "../components/Sidebar.js";
import { TopNav } from "../components/TopNav.js";
import { SkeletonPanel } from "../components/ui/ListSkeletons.js";
import { useDashboardLayout } from "../hooks/use-dashboard-layout.js";

const DeepOceanBackground = lazy(() => import("../components/chat/DeepOceanBackground.js").then((module) => ({
  default: module.DeepOceanBackground,
})));

export const DashboardLayout = () => {
  const {
    isMobile,
    isDark,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    toggleTheme,
    showSidebar,
  } = useDashboardLayout();

  return (
    <div className="flex h-screen overflow-hidden font-sans text-slate-900 dark:text-slate-200 bg-[#F9F8F4] dark:bg-void-900 transition-colors duration-700">
      {showSidebar && (
        <Sidebar
          isMobile={isMobile}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <div className="flex flex-col flex-1 h-screen overflow-hidden relative">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900 focus:font-bold focus:rounded-br-lg "
        >
          Skip to main content
        </a>
        <Suspense fallback={null}>
          <DeepOceanBackground />
        </Suspense>

        <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
          <TopNav
            isDark={isDark}
            toggleTheme={toggleTheme}
            onMenuToggle={() => setIsMobileSidebarOpen((prev) => !prev)}
            isMobile={isMobile}
          />

          <main
            id="main-content"
            tabIndex={-1}
            aria-label="Main content"
            className={`flex-1 overflow-y-auto dashboard-scrollbar relative ${
              showSidebar ? "" : "pb-32"
            }`}
          >
            <Suspense fallback={<div className="flex-1 p-8"><SkeletonPanel /></div>}>
              <Outlet />
            </Suspense>
          </main>
        </div>

        {!showSidebar && <KineticDock />}
        <footer className="sr-only">Dashboard Footer</footer>
      </div>
    </div>
  );
};
