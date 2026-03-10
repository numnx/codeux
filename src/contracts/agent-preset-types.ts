export interface AgentPresetRecord {
  id: string;
  projectId: string;
  name: string;
  instructionMarkdown: string;
  labels: string[];
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
