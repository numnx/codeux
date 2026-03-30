import type { RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(containerRef: RefObject<HTMLElement>, onClose: () => void) {
    const triggerRef = useRef<HTMLElement | null>(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        triggerRef.current = document.activeElement as HTMLElement | null;

        if (containerRef.current) {
            const focusableElements = Array.from(containerRef.current.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[];
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        }

        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onCloseRef.current();
            } else if (event.key === "Tab") {
                if (!containerRef.current) return;

                const focusableElements = Array.from(containerRef.current.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[];

                if (focusableElements.length === 0) return;

                const first = focusableElements[0];
                const last = focusableElements[focusableElements.length - 1];

                if (!containerRef.current.contains(document.activeElement)) {
                    event.preventDefault();
                    first.focus();
                    return;
                }

                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener("keydown", handler);
        return () => {
            document.removeEventListener("keydown", handler);
            if (triggerRef.current) {
                triggerRef.current.focus();
            }
        };
    }, [containerRef]);
}
