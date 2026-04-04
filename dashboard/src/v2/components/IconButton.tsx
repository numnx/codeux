import type { FunctionComponent, ComponentProps } from "preact";
import { memo } from "preact/compat";

interface IconButtonProps extends ComponentProps<"button"> {
    children: preact.ComponentChildren;
    title?: string;
    "aria-label"?: string;
}

export const IconButton: FunctionComponent<IconButtonProps> = memo(({ children, className = "", title, "aria-label": ariaLabel, ...props }) => {
    return (
        <button
            {...props}
            title={title}
            aria-label={ariaLabel || title}
            className={`flex items-center justify-center p-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-500 active:scale-95 touch-target ${className}`}
        >
            {children}
        </button>
    );
});
