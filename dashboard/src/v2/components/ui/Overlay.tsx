import { h, FunctionComponent, ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";

interface OverlayProps {
  isOpen: boolean;
  onClose?: () => void;
  children?: ComponentChildren;
  className?: string;
  testId?: string;
  isAnimatingExit?: boolean;
}

export const Overlay: FunctionComponent<OverlayProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
  testId = "overlay",
  isAnimatingExit = false
}) => {
  const reducedMotion = useReducedMotion();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Short delay to allow the DOM node to mount with opacity-0, then trigger the transition to opacity-100
      const frameId = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimatingIn(true));
      });
      return () => cancelAnimationFrame(frameId);
    } else {
      setIsAnimatingIn(false);
      if (!isAnimatingExit) {
        const timer = setTimeout(() => {
          setShouldRender(false);
        }, reducedMotion ? 0 : 200); // 200ms exit
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, isAnimatingExit, reducedMotion]);

  if (!shouldRender && !isAnimatingExit) return null;

  const opacityClass = isAnimatingIn ? "opacity-100" : "opacity-0";
  const transitionClass = reducedMotion ? "" : isAnimatingIn ? "transition-opacity duration-300 ease-linear" : "transition-opacity duration-200 ease-linear";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${transitionClass} ${opacityClass} ${className}`}
      data-testid={testId}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
};
