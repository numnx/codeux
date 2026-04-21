import { useState, useEffect, useMemo } from "preact/hooks";
import { useProjectData } from "../context/project-data.js";
import { useProjectEffectiveSettings } from "./use-project-effective-settings.js";

export function useDashboardLayout() {
  const { selectedProject } = useProjectData();
  const { data: effectiveSettings } = useProjectEffectiveSettings(selectedProject?.id || null);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const appearanceTheme = effectiveSettings?.settings.appearance?.theme || "SYSTEM";
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    if (appearanceTheme === "SYSTEM") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return appearanceTheme === "DARK";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (appearanceTheme === "SYSTEM") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
      setIsDark(mediaQuery.matches);
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", listener);
      } else {
        mediaQuery.addListener(listener);
      }
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener("change", listener);
        } else {
          mediaQuery.removeListener(listener);
        }
      };
    } else {
      setIsDark(appearanceTheme === "DARK");
    }
  }, [appearanceTheme]);

  useEffect(() => {
    const root = window.document.documentElement;
    const bg = isDark ? "#0d0f12" : "#dbe8f8";
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
    root.style.background = bg;
    document.body.style.background = bg;
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const navMode = effectiveSettings?.settings.appearance?.navigationMode || "DOCK";
  const showSidebar = isMobile || navMode === "SIDEBAR";

  return {
    isMobile,
    isDark,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    toggleTheme,
    showSidebar,
  };
}
