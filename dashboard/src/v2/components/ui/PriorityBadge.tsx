import type { FunctionComponent } from "preact";
import type { TaskPriority } from "../../types.js";
import { Flame, AlertCircle, Circle } from "lucide-preact";

interface PriorityBadgeProps {
    priority: TaskPriority;
    className?: string;
}

export const PriorityBadge: FunctionComponent<PriorityBadgeProps> = ({ priority, className = "" }) => {
    const getPriorityConfig = (p: TaskPriority) => {
        switch (p) {
            case "critical":
                return {
                    label: "Critical",
                    styles: "bg-status-red/[0.08] text-status-red border-status-red/25 shadow-[0_0_12px_rgba(227,0,15,0.15)]",
                    icon: Flame
                };
            case "high":
                return {
                    label: "High",
                    styles: "bg-status-amber/[0.08] text-status-amber border-status-amber/25",
                    icon: AlertCircle
                };
            case "medium":
                return {
                    label: "Medium",
                    styles: "bg-ember-500/[0.08] text-ember-600 dark:text-ember-400 border-ember-500/25",
                    icon: Circle
                };
            case "low":
            default:
                return {
                    label: "Low",
                    styles: "bg-signal-500/[0.08] text-signal-600 dark:text-signal-400 border-signal-500/25",
                    icon: Circle
                };
        }
    };

    const { label, styles, icon: Icon } = getPriorityConfig(priority);

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-[0.14em] transition-all duration-300 ${styles} ${className}`}>
            <Icon className="w-3 h-3" strokeWidth={2.5} />
            <span>{label}</span>
        </div>
    );
};
