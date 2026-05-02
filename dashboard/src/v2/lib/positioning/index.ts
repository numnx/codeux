export type Position = "top" | "bottom" | "left" | "right";
export type Alignment = "start" | "center" | "end";

interface CalculatePositionArgs {
    triggerRect: DOMRect;
    contentRect: DOMRect;
    position: Position;
    align?: Alignment;
    gap?: number;
    padding?: number;
    viewportWidth?: number;
    viewportHeight?: number;
}

export function calculatePosition({
    triggerRect,
    contentRect,
    position,
    align = "center",
    gap = 8,
    padding = 8,
    viewportWidth = window.innerWidth,
    viewportHeight = window.innerHeight,
}: CalculatePositionArgs) {
    let top = 0;
    let left = 0;
    const effectiveWidth = Math.min(contentRect.width, Math.max(0, viewportWidth - padding * 2));
    const effectiveHeight = Math.min(contentRect.height, Math.max(0, viewportHeight - padding * 2));

    switch (position) {
        case "top":
            top = triggerRect.top - effectiveHeight - gap;
            break;
        case "bottom":
            top = triggerRect.bottom + gap;
            break;
        case "left":
            left = triggerRect.left - effectiveWidth - gap;
            break;
        case "right":
            left = triggerRect.right + gap;
            break;
    }

    if (position === "top" || position === "bottom") {
        switch (align) {
            case "start":
                left = triggerRect.left;
                break;
            case "center":
                left = triggerRect.left + triggerRect.width / 2 - effectiveWidth / 2;
                break;
            case "end":
                left = triggerRect.right - effectiveWidth;
                break;
        }
    } else {
        switch (align) {
            case "start":
                top = triggerRect.top;
                break;
            case "center":
                top = triggerRect.top + triggerRect.height / 2 - effectiveHeight / 2;
                break;
            case "end":
                top = triggerRect.bottom - effectiveHeight;
                break;
        }
    }

    // Boundary checks with fallback positions
    if (position === "top" || position === "bottom") {
        if (left < padding) left = padding;
        if (left + effectiveWidth > viewportWidth - padding) {
            left = viewportWidth - effectiveWidth - padding;
        }

        // Vertical collision
        if (position === "top" && top < padding) {
            top = triggerRect.bottom + gap; // Flip to bottom
        } else if (position === "bottom" && top + effectiveHeight > viewportHeight - padding) {
            top = triggerRect.top - effectiveHeight - gap; // Flip to top
        }
    } else {
         if (top < padding) top = padding;
         if (top + effectiveHeight > viewportHeight - padding) {
            top = viewportHeight - effectiveHeight - padding;
         }

         // Horizontal collision
         if (position === "left" && left < padding) {
             left = triggerRect.right + gap; // Flip to right
         } else if (position === "right" && left + effectiveWidth > viewportWidth - padding) {
             left = triggerRect.left - effectiveWidth - gap; // Flip to left
         }
    }

    // Final boundary safeguard
    if (top < padding) top = padding;
    if (left < padding) left = padding;
    if (top + effectiveHeight > viewportHeight - padding) {
        top = Math.max(padding, viewportHeight - effectiveHeight - padding);
    }
    if (left + effectiveWidth > viewportWidth - padding) {
        left = Math.max(padding, viewportWidth - effectiveWidth - padding);
    }

    return { top, left };
}
