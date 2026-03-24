import { createContext } from "preact";
import { useCallback, useContext, useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren, FunctionComponent } from "preact";
import type { CreateProjectInput, Source, UpdateProjectInput } from "../types.js";
import type { DashboardRealtimeServerMessage } from "../../types.js";
import {
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  fetchProjects,
  selectProject as selectProjectRequest,
  updateProject as updateProjectRequest,
} from "../lib/project-api.js";
import { subscribeToDashboardRealtime } from "../../lib/realtime/dashboard-realtime-client.js";
import { areProjectListsEqual, shouldUseForegroundLoading } from "../hooks/project-resource-utils.js";

interface ProjectDataContextValue {
  projects: Source[];
  selectedProjectId: string | null;
  selectedProject: Source | null;
  loading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
  selectProject: (projectId: string) => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Source>;
  updateProject: (projectId: string, input: UpdateProjectInput) => Promise<Source>;
  deleteProject: (projectId: string) => Promise<void>;
}

const ProjectDataContext = createContext<ProjectDataContextValue | null>(null);

let projectCache: { projects: Source[]; selectedProjectId: string | null } | null = null;

export const ProjectDataProvider: FunctionComponent<{ children: ComponentChildren }> = ({ children }) => {
  const [projects, setProjects] = useState<Source[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const refreshProjects = useCallback(async (options?: { silent?: boolean }): Promise<void> => {
    const shouldUseForegroundState = shouldUseForegroundLoading(hasLoadedRef.current, options?.silent);
    if (shouldUseForegroundState) {
      setLoading(true);
    }

    try {
      const response = await fetchProjects();
      const nextSelectedProjectId = response.selectedProjectId ?? response.projects[0]?.id ?? null;

      projectCache = {
        projects: response.projects,
        selectedProjectId: nextSelectedProjectId,
      };

      setProjects((current) => areProjectListsEqual(current, response.projects) ? current : response.projects);
      setSelectedProjectId(nextSelectedProjectId);
      hasLoadedRef.current = true;
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    } finally {
      if (shouldUseForegroundState) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (projectCache) {
      setProjects(projectCache.projects);
      setSelectedProjectId(projectCache.selectedProjectId);
      setLoading(false);
      setError(null);
      hasLoadedRef.current = true;
      void refreshProjects({ silent: true });
      return;
    }

    hasLoadedRef.current = false;
    void refreshProjects();
  }, [refreshProjects]);

  useEffect(() => (
    subscribeToDashboardRealtime(["projects"], (message: DashboardRealtimeServerMessage) => {
      if (message.type === "snapshot_required") {
        void refreshProjects({ silent: true });
        return;
      }

      if (message.type !== "event" || message.event.eventType !== "projects.updated") {
        return;
      }

      const payload = message.event.payload as Awaited<ReturnType<typeof fetchProjects>>;
      const nextSelectedProjectId = payload.selectedProjectId ?? payload.projects[0]?.id ?? null;
      projectCache = { projects: payload.projects, selectedProjectId: nextSelectedProjectId };
      setProjects((current) => areProjectListsEqual(current, payload.projects) ? current : payload.projects);
      setSelectedProjectId(nextSelectedProjectId);
      setLoading(false);
      setError(null);
    })
  ), [refreshProjects]);

  const selectProject = async (projectId: string): Promise<void> => {
    const nextProjectId = await selectProjectRequest(projectId);
    setSelectedProjectId(nextProjectId);
  };

  const createProject = async (input: CreateProjectInput): Promise<Source> => {
    const project = await createProjectRequest(input);
    await refreshProjects();
    await selectProject(project.id);
    return project;
  };

  const updateProject = async (projectId: string, input: UpdateProjectInput): Promise<Source> => {
    const project = await updateProjectRequest(projectId, input);
    await refreshProjects();
    return project;
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    await deleteProjectRequest(projectId);
    await refreshProjects();
  };

  const value: ProjectDataContextValue = {
    projects,
    selectedProjectId,
    selectedProject: projects.find((project) => project.id === selectedProjectId) || null,
    loading,
    error,
    refreshProjects,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
  };

  return (
    <ProjectDataContext.Provider value={value}>
      {children}
    </ProjectDataContext.Provider>
  );
};

export const useProjectData = (): ProjectDataContextValue => {
  const context = useContext(ProjectDataContext);
  if (!context) {
    throw new Error("useProjectData must be used within ProjectDataProvider");
  }
  return context;
};
