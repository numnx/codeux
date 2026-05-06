import { useState, useEffect, useContext } from "preact/hooks";
import { ProjectDataContext } from "../context/project-data.js";
import { useProjectEffectiveSettings } from "./use-project-effective-settings.js";

export function useReducedMotion(): boolean {
    const projectContext = useContext(ProjectDataContext);
    const selectedProject = projectContext?.selectedProject || null;
    const { data: effectiveSettings } = useProjectEffectiveSettings(selectedProject?.id || null);

    const preference = effectiveSettings?.settings.appearance?.reducedMotion || "AUTO";

    const [systemReducedMotion, setSystemReducedMotion] = useState(() => {
        if (typeof window !== "undefined" && window.matchMedia) {
            return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) {
            return;
        }

        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

        const listener = (event: MediaQueryListEvent) => {
            setSystemReducedMotion(event.matches);
        };

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
    }, []);

    const isReducedMotion = preference === "REDUCE" || (preference !== "NONE" && systemReducedMotion);

    useEffect(() => {
        if (typeof document === "undefined") return;
        if (isReducedMotion) {
            document.documentElement.setAttribute("data-reduced-motion", "true");
        } else {
            document.documentElement.removeAttribute("data-reduced-motion");
        }
    }, [isReducedMotion]);

    return isReducedMotion;
}
