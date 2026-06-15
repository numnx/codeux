import { h, ComponentChildren, FunctionComponent } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";
import gsap from "gsap";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";
import { useFocusTrap } from "../../hooks/use-focus-trap.js";
import { GSAP_DURATIONS, GSAP_EASINGS } from "../../lib/motion/constants.js";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ComponentChildren;
  className?: string;
  position?: "left" | "right";
  disableBackdropClick?: boolean;
}

export const Drawer: FunctionComponent<DrawerProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
  position = "right",
  disableBackdropClick = false,
}) => {
  const reducedMotion = useReducedMotion();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const cardRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const trapRef = useFocusTrap(isOpen, { onClose });

  const isRight = position === "right";
  const alignmentClass = isRight ? "right-0" : "left-0";

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const duration = reducedMotion ? 0 : GSAP_DURATIONS.slow;
      const xStart = isRight ? "100%" : "-100%";

      requestAnimationFrame(() => {
        const tl = gsap.timeline();
        if (scrimRef.current) {
          tl.fromTo(scrimRef.current, { opacity: 0 }, { opacity: 1, duration: reducedMotion ? 0 : GSAP_DURATIONS.base, ease: GSAP_EASINGS.smooth }, 0);
        }
        if (cardRef.current) {
          tl.fromTo(cardRef.current,
            { x: xStart },
            { x: "0%", duration, ease: "back.out(1.1)" }, 0
          );
        }
      });
    } else {
      const duration = reducedMotion ? 0 : GSAP_DURATIONS.base;
      const xEnd = isRight ? "100%" : "-100%";

      const tl = gsap.timeline({
        onComplete: () => {
          setShouldRender(false);
        }
      });

      if (scrimRef.current) {
        tl.to(scrimRef.current, { opacity: 0, duration: reducedMotion ? 0 : GSAP_DURATIONS.base, ease: GSAP_EASINGS.smooth }, 0);
      }
      if (cardRef.current) {
        tl.to(cardRef.current, {
          x: xEnd,
          duration,
          ease: "power2.in",
        }, 0);
      }

      if (!cardRef.current && !scrimRef.current) {
        setShouldRender(false);
      }
    }
  }, [isOpen, reducedMotion, isRight]);

  const handleScrimClick = () => {
    if (!disableBackdropClick) {
      onClose();
    }
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        ref={scrimRef}
        className="absolute inset-0 bg-void-900/50 backdrop-blur-sm"
        style={{ opacity: 0 }}
        onClick={handleScrimClick}
      />
      <div
        ref={(el) => {
          cardRef.current = el;
          if (trapRef) {
            (trapRef as any).current = el;
          }
        }}
        role="dialog"
        aria-modal="true"
        className={`fixed top-0 bottom-0 ${alignmentClass} z-50 w-full max-w-md bg-white dark:bg-void-800 rounded-[12px] shadow-lg border-x border-black/[0.06] dark:border-white/[0.06] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

