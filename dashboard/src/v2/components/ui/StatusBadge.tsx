import type { FunctionComponent } from "preact";
import { StatusDot } from "./StatusDot.js";
import type { SourceStatus } from "../../types.js";

interface StatusBadgeProps {
    status: SourceStatus;
    className?: string;
}

export const StatusBadge: FunctionComponent<StatusBadgeProps> = ({ status, className = "" }) => {
    const label = status.replace("_", " ");
    
    const getStatusStyles = (s: SourceStatus) => {
        switch (s) {
            case "running":
                return "bg-status-green/[0.08] text-status-green border-status-green/20";
            case "failed":
                return "bg-status-red/[0.08] text-status-red border-status-red/20";
            case "intervention":
                return "bg-status-amber/[0.08] text-status-amber border-status-amber/20";
            case "idle":
            default:
                return "bg-slate-400/[0.08] text-slate-500 dark:text-slate-400 border-slate-400/20";
        }
    };

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-[0.14em] transition-all duration-300 ${getStatusStyles(status)} ${className}`}>
            <StatusDot status={status} className="w-1.5 h-1.5" />
            <span>{label}</span>
        </div>
    );
};
