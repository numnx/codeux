import { useEffect, useState } from "preact/hooks";

export interface UseProgressiveListOptions {
  initialCount?: number;
  incrementCount?: number;
  delay?: number;
}

/**
 * Progressively renders a list of items to keep the UI responsive.
 * Useful for large collections of sprints or tasks.
 */
export function useProgressiveList<T>(
  items: T[],
  options: UseProgressiveListOptions = {}
): T[] {
  const {
    initialCount = 20,
    incrementCount = 20,
    delay = 10,
  } = options;

  const [visibleCount, setVisibleCount] = useState(initialCount);

  // Reset visible count when items change significantly (e.g. project switch)
  // or if the items array is now smaller than what we're showing.
  useEffect(() => {
    setVisibleCount(initialCount);
  }, [items.length, initialCount]);

  useEffect(() => {
    if (visibleCount >= items.length) {
      return;
    }

    const timer = setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + incrementCount, items.length));
    }, delay);

    return () => clearTimeout(timer);
  }, [visibleCount, items.length, incrementCount, delay]);

  return items.slice(0, visibleCount);
}
