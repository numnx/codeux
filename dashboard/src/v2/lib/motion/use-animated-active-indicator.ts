import { useEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { SPRING_TRANSITIONS } from "./tokens.js";
import { useReducedMotionSafe } from "./useReducedMotionSafe.js";

/**
 * A shared hook to animate a sliding "active indicator" across a list of items.
 *
 * @param activeIndex - The index of the currently active item.
 * @param parentRef - A ref to the container element holding the items.
 * @param selector - A CSS selector to identify the individual items within the parent.
 * @param indicatorRef - A ref to the indicator element that will be animated.
 * @param propertyToAnimate - Which property to animate to represent sliding. Default: 'y' for vertical, 'x' for horizontal.
 * @param dimensionToAnimate - Which dimension to animate to match the active item's size. Default: 'height', 'width' for horizontal.
 */
export function useAnimatedActiveIndicator({
    activeIndex,
    parentRef,
    selector,
    indicatorRef,
    propertyToAnimate = 'y',
    dimensionToAnimate = 'height'
}: {
    activeIndex: number;
    parentRef: preact.RefObject<HTMLElement>;
    selector: string;
    indicatorRef: preact.RefObject<HTMLElement>;
    propertyToAnimate?: 'x' | 'y';
    dimensionToAnimate?: 'width' | 'height';
}) {
    const safeGsap = useReducedMotionSafe();

    useEffect(() => {
        if (activeIndex < 0 || !parentRef.current || !indicatorRef.current) return;

        const items = parentRef.current.querySelectorAll(selector);
        const activeElement = items[activeIndex] as HTMLElement;

        if (!activeElement) return;

        // Ensure parent is relative or has explicit positioning to allow accurate offsets
        const parentRect = parentRef.current.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();

        const offset = propertyToAnimate === 'y'
            ? activeRect.top - parentRect.top + parentRef.current.scrollTop
            : activeRect.left - parentRect.left + parentRef.current.scrollLeft;

        const dimension = dimensionToAnimate === 'height' ? activeRect.height : activeRect.width;

        // Position initial state instantly on first run or animate smoothly
        safeGsap.to(indicatorRef.current, {
            [propertyToAnimate]: offset,
            [dimensionToAnimate]: dimension,
            duration: SPRING_TRANSITIONS.bouncy.duration,
            ease: SPRING_TRANSITIONS.bouncy.ease,
            overwrite: "auto"
        });

    }, [activeIndex, parentRef, selector, indicatorRef, propertyToAnimate, dimensionToAnimate, safeGsap]);
}
