export interface QuicksprintTemplateRecord {
  id: string;
  projectId: string | null;
  name: string;
  description: string;
  icon: string;
  category: string;
  agentInstructionMarkdown: string;
  defaultTaskCount: number;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuicksprintTemplateInput {
  name: string;
  description: string;
  icon: string;
  category: string;
  agentInstructionMarkdown: string;
  defaultTaskCount?: number;
}

export interface UpdateQuicksprintTemplateInput {
  name?: string;
  description?: string;
  icon?: string;
  category?: string;
  agentInstructionMarkdown?: string;
  defaultTaskCount?: number;
}

export interface QuicksprintExecutionInput {
  templateId: string;
  taskCount: number;
  submitMode: "plan_only" | "plan_and_start";
  routeOverride?: string;
  modelOverride?: string;
}
