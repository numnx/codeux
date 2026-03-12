export type AgentSourceScope = "project" | "home" | "default";
export type AgentSyncStatus = "manual" | "synced" | "out_of_sync" | "missing_source";

export interface AgentPresetRecord {
  id: string;
  projectId: string;
  name: string;
  instructionMarkdown: string;
  labels: string[];
  sourcePath: string | null;
  sourceScope: AgentSourceScope | null;
  sourceUpdatedAt: string | null;
  sourceImportedAt: string | null;
  sourceExists: boolean;
  syncStatus: AgentSyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentPresetInput {
  name: string;
  instructionMarkdown?: string;
  labels?: string[];
}

export interface UpdateAgentPresetInput {
  name?: string;
  instructionMarkdown?: string;
  labels?: string[];
}
