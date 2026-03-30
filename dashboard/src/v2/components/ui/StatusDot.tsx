import type { FunctionComponent } from "preact";
import { CheckCircle2, XCircle, AlertTriangle, Circle } from "lucide-preact";
import type { SourceStatus } from "../../types.js";

interface StatusDotProps {
    status: SourceStatus;
    className?: string;
}

export const StatusDot: FunctionComponent<StatusDotProps> = ({ status, className = "w-3.5 h-3.5" }) => {
    switch (status) {
        case "running":
            return <CheckCircle2 className={`shrink-0 text-status-green drop-shadow-[0_0_4px_rgba(0,171,132,0.6)] ${className}`} />;
        case "failed":
            return <XCircle className={`shrink-0 text-status-red drop-shadow-[0_0_4px_rgba(227,0,15,0.5)] ${className}`} />;
        case "intervention":
            return <AlertTriangle className={`shrink-0 text-status-amber drop-shadow-[0_0_4px_rgba(245,158,11,0.5)] ${className}`} />;
        case "idle":
        default:
            return <Circle className={`shrink-0 text-slate-400 dark:text-slate-600 ${className}`} />;
    }
};
