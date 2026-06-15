import type { JulesActivity } from "./jules-types.js";

export interface ReadinessProbeStatus {
  status: "UP" | "READY" | "NOT_READY" | "DOWN";
  components?: {
    settingsDb: "UP" | "DOWN";
    dashboardBind: "UP" | "DOWN";
    mcpService: "UP" | "DOWN";
  };
}

export interface DockerContainer {
  id: string;
  names: string;
  image: string;
  status: string;
  state: string;
  runningFor: string;
  labels: Record<string, string>;
}

export interface LiveActivitiesResponse {
  activitiesBySession: Record<string, JulesActivity[]>;
  polledAt: string;
  cacheTtlMs: number;
}
