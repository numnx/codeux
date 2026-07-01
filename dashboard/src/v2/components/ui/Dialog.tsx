import { h, ComponentChildren, FunctionComponent, toChildArray, isValidElement, cloneElement } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";
import gsap from "gsap";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";
import { useFocusTrap } from "../../hooks/use-focus-trap.js";
import { Overlay } from "./Overlay.js";
import { useInteractionTokens } from "../../lib/motion/tokens.js";
import { useGsapInteractionTokens } from "../../lib/motion/constants.js";
import { MODAL_MOTION } from "../../lib/motion/modal-motion.js";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: ComponentChildren;
  className?: string;
  disableBackdropClick?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  initialFocusRef?: { current: HTMLElement | null };
  /** @deprecated use ariaLabelledBy */
  ariaLabelledby?: string;
  /** @deprecated use ariaDescribedBy */
  ariaDescribedby?: string;
}

export const Dialog: FunctionComponent<DialogProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
  disableBackdropClick = false,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  initialFocusRef,
  ariaLabelledby,
  ariaDescribedby,
}) => {
  const reducedMotion = useReducedMotion();
  const cssTokens = useInteractionTokens();
  const gsapTokens = useGsapInteractionTokens();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [visible, setVisible] = useState(isOpen);

  const trapRef = useFocusTrap(isOpen, { onClose, restoreFocus: true, initialFocusRef });

  const hasAccessibleName = ariaLabel || ariaLabelledBy || ariaLabelledby;
  const fallbackAriaLabel = !hasAccessibleName ? "Dialog" : undefined;

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        if (cardRef.current) {
          gsap.fromTo(cardRef.current,
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: reducedMotion ? 0 : MODAL_MOTION.entry.duration, ease: MODAL_MOTION.entry.ease }
          );
        }
        setVisible(true);
      });
    } else {
      setVisible(false);
      if (cardRef.current) {
        gsap.to(cardRef.current, {
          opacity: 0,
          scale: 0.95,
          duration: reducedMotion ? 0 : MODAL_MOTION.exit.duration,
          ease: MODAL_MOTION.exit.ease,
          onComplete: () => setShouldRender(false)
        });
      } else {
        setShouldRender(false);
      }
    }
  }, [isOpen, reducedMotion]);

  if (!shouldRender) return null;

  return (
    <Overlay isOpen={isOpen} onClose={disableBackdropClick ? undefined : onClose} blur className="!items-end sm:!items-center pb-4 sm:pb-0">
      <div
        ref={(el) => {
          (cardRef as any).current = el;
          if (trapRef) (trapRef as any).current = el;
        }}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || fallbackAriaLabel}
        aria-labelledby={ariaLabelledBy || ariaLabelledby}
        aria-describedby={ariaDescribedBy || ariaDescribedby || undefined}
        tabIndex={-1}
        inert={!isOpen ? true : undefined}
        className={`relative z-50 bg-white dark:bg-void-800 rounded-[1.75rem] shadow-2xl border border-black/[0.06] dark:border-white/[0.06] outline-none max-w-[calc(100vw-2rem)] max-h-[min(calc(100dvh-2rem),85vh)] overflow-y-auto overscroll-contain ${className}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside dialog
      >
        {toChildArray(children).map((child, index) => {
          if (isValidElement(child)) {
            const childProps = child.props as Record<string, any>;
            if (reducedMotion) {
              return child;
            }

            const delay = ['0ms', '40ms', '80ms'][index] || '0ms';
            const childClassName = `${childProps.className || ''} motion-safe:animate-form-slide-down`.trim();
            const childStyle = {
              ...(childProps.style || {}),
              animationFillMode: 'both',
              animationDelay: delay
            };

            return cloneElement(child, {
              className: childClassName,
              style: childStyle
            } as any);
          }
          return child;
        })}
      </div>
    </Overlay>
  );
};
