import { h, FunctionComponent, ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";
import { Overlay } from "./Overlay.js";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ComponentChildren;
  side?: "left" | "right" | "top" | "bottom";
  className?: string;
  testId?: string;
}

export const Drawer: FunctionComponent<DrawerProps> = ({
  isOpen,
  onClose,
  children,
  side = "right",
  className = "",
  testId = "drawer"
}) => {
  const reducedMotion = useReducedMotion();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const frameId = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimatingIn(true));
      });
      return () => cancelAnimationFrame(frameId);
    } else {
      setIsAnimatingIn(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, reducedMotion ? 0 : 200); // 200ms exit
      return () => clearTimeout(timer);
    }
  }, [isOpen, reducedMotion]);

  if (!shouldRender) return null;

  const sideClasses = {
    right: "right-0 top-0 h-full",
    left: "left-0 top-0 h-full",
    top: "top-0 left-0 w-full",
    bottom: "bottom-0 left-0 w-full"
  };

  const translateClasses = {
    right: isAnimatingIn ? "translate-x-0" : "translate-x-full",
    left: isAnimatingIn ? "translate-x-0" : "-translate-x-full",
    top: isAnimatingIn ? "translate-y-0" : "-translate-y-full",
    bottom: isAnimatingIn ? "translate-y-0" : "translate-y-full"
  };

  const transitionClass = reducedMotion
    ? ""
    : isAnimatingIn
      ? "transition-transform duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.1)]" // spring-like entrance
      : "transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"; // smooth exit

  return (
    <Overlay isOpen={isOpen} onClose={onClose} className="justify-end" isAnimatingExit={!isOpen && shouldRender}>
      <div
        role="dialog"
        aria-modal="true"
        data-testid={testId}
        className={`fixed bg-white dark:bg-void-900 shadow-xl overflow-hidden ${sideClasses[side]} ${transitionClass} ${translateClasses[side]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </Overlay>
  );
};
