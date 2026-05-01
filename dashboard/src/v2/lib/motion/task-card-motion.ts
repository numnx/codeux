import { useLayoutEffect, useEffect, useRef } from "preact/hooks";
import type { RefObject } from "preact";
import gsap from "gsap";

export function useTaskCardMotion(ref: RefObject<HTMLElement>, status: string, isReducedMotion: boolean, index: number = 0) {
  const isMounted = useRef(false);

  useLayoutEffect(() => {
    if (!ref.current || isReducedMotion) return;
    gsap.fromTo(ref.current,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", delay: index * 0.05, clearProps: "transform,opacity" }
    );
  }, [isReducedMotion, index]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (!ref.current || isReducedMotion) return;

    gsap.fromTo(ref.current,
      { scale: 1.02, boxShadow: '0 0 0 2px rgba(0, 224, 160, 0.4)' },
      { scale: 1, boxShadow: 'none', duration: 0.3, ease: "power2.out", clearProps: "boxShadow,transform" }
    );
  }, [status, isReducedMotion]);
}
