import type { FunctionComponent } from "preact";
import { memo } from "preact/compat";
import { useMemo } from "preact/hooks";
import { AlertTriangle } from "lucide-preact";
import { CollapsiblePanel } from "./ui/CollapsiblePanel.js";
import { renderMarkdown } from "../../lib/markdown.js";
import type { DashboardStatus } from "../../types.js";

import { useProjectData } from "../context/project-data.js";
import { useDashboardRuntimeData } from "../../hooks/use-dashboard-runtime-data.js";

export const SprintProtocol: FunctionComponent = memo(() => {
    const { selectedProjectId } = useProjectData();
    const { status, initialLoadComplete, execution } = useDashboardRuntimeData(selectedProjectId);

    // Simplistic hasSprintContext derived state matching what was passed
    const hasSprintContext = Boolean(status.sprint_id || execution.sprintRuns.length > 0 || execution.taskDispatches.length > 0);

    const protocolMarkup = useMemo(() => (
        renderMarkdown(hasSprintContext ? status.instructions : undefined)
        || '<p class="text-slate-400 dark:text-slate-600 italic">No active sprint protocol.</p>'
    ), [hasSprintContext, status.instructions]);

    return (
        <CollapsiblePanel
            title="Protocol"
            icon={AlertTriangle}
            accentHex="#FFB800"
            defaultOpen={false}
        >
            <div
                className="prose prose-sm max-w-none text-slate-600 dark:text-slate-400
                           prose-headings:text-slate-800 dark:prose-headings:text-slate-200
                           prose-code:text-signal-600 dark:prose-code:text-signal-400
                           prose-code:bg-signal-500/[0.06] prose-code:px-1 prose-code:rounded-md
                           font-mono text-[12px] leading-relaxed max-h-64 overflow-y-auto dashboard-scrollbar"
                dangerouslySetInnerHTML={{ __html: protocolMarkup }}
            />
        </CollapsiblePanel>
    );
});
