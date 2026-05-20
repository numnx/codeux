import { h, FunctionComponent, ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";
import { Overlay } from "./Overlay.js";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: ComponentChildren;
  className?: string;
  testId?: string;
}

export const Dialog: FunctionComponent<DialogProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
  testId = "dialog"
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

  const transformClass = isAnimatingIn ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2";
  const transitionClass = reducedMotion ? "" : isAnimatingIn ? "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]" : "transition-all duration-200 ease-in";

  return (
    <Overlay isOpen={isOpen} onClose={onClose} isAnimatingExit={!isOpen && shouldRender}>
      <div
        role="dialog"
        aria-modal="true"
        data-testid={testId}
        className={`bg-white dark:bg-void-900 rounded-lg shadow-xl ${transitionClass} ${transformClass} ${className}`}
      >
        {children}
      </div>
    </Overlay>
  );
};
