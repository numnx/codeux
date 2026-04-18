import { type FunctionComponent, type ComponentProps } from "preact";
import { useRef } from "preact/hooks";
import { memo } from "preact/compat";
import { Tooltip } from "./ui/Tooltip.js";
import { useMagnetic } from "../hooks/use-magnetic.js";
import { useWeightedPress } from "../hooks/use-weighted-press.js";

interface IconButtonProps extends ComponentProps<"button"> {
    children: preact.ComponentChildren;
    title?: string;
    "aria-label"?: string;
}

export const IconButton: FunctionComponent<IconButtonProps> = memo(({ children, className = "", title, "aria-label": ariaLabel, ...props }) => {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const targetRef = useRef<HTMLDivElement>(null);

    useMagnetic(triggerRef, targetRef, { maxDisplacement: 4 });
    useWeightedPress(triggerRef);

    const button = (
        <button
            {...props}
            ref={triggerRef}
            aria-label={ariaLabel || title}
            className={`flex items-center justify-center p-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-500 touch-target transition-colors ${className}`}
        >
            <div ref={targetRef} className="flex items-center justify-center pointer-events-none">
                {children}
            </div>
        </button>
    );

    if (title) {
        return (
            <Tooltip content={title} position="bottom">
                {button}
            </Tooltip>
        );
    }

    return button;
});
