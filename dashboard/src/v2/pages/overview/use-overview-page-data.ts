import { useProjectData } from "../../context/project-data.js";
import { useProjectSprints } from "../../hooks/use-project-sprints.js";
import { useProjectTasks } from "../../hooks/use-project-tasks.js";
import { useOverviewTelemetry } from "../../../hooks/use-overview-telemetry.js";
import { computeOverviewPageState } from "../../lib/overview-page-state.js";

export function useOverviewPageData() {
    const { projects, selectedProject } = useProjectData();
    const { sprints } = useProjectSprints(selectedProject?.id || null);
    const { tasks } = useProjectTasks(selectedProject?.id || null, projects, sprints);
    const { telemetry, error: telemetryError } = useOverviewTelemetry();

    return computeOverviewPageState({
        projects,
        selectedProject,
        sprints,
        tasks,
        telemetry,
        telemetryError
    });
}
