import { useEffect, useRef, useState } from "preact/hooks";

interface UseProgressiveListOptions {
  initialCount?: number;
  stepCount?: number;
  rootMargin?: string;
}

export function useProgressiveList<T>(
  items: T[],
  options: UseProgressiveListOptions = {},
) {
  const {
    initialCount = 12,
    stepCount = 8,
    rootMargin = "120px 0px 120px 0px",
  } = options;

  const [visibleCount, setVisibleCount] = useState(initialCount);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(Math.min(initialCount, items.length));
  }, [items.length, initialCount]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= items.length) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) {
        return;
      }
      setVisibleCount((current) => Math.min(items.length, current + stepCount));
    }, {
      root,
      rootMargin,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, visibleCount, stepCount, rootMargin]);

  return {
    visibleItems: items.slice(0, visibleCount),
    visibleCount,
    hasMore: visibleCount < items.length,
    sentinelRef,
    scrollContainerRef,
  };
}
