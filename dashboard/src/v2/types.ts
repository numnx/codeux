import type {
  CreateProjectInput,
  CreateSprintInput,
  CreateTaskInput,
  ProjectCollectionResponse,
  ProjectStatus,
  ProjectSummary,
  SprintMarkdownExportBundle,
  SprintMarkdownImportInput,
  SprintMarkdownImportTask,
  SprintRecord,
  SprintStatus,
  TaskPriority,
  TaskRecord,
  TaskStatus,
  UpdateProjectInput,
  UpdateSprintInput,
  UpdateTaskInput,
} from "../../../src/contracts/project-management-types.js";

export type SourceStatus = ProjectStatus;
export type Source = ProjectSummary;

export interface Sprint extends SprintRecord {
  date: string;
}

export interface Task {
  recordId: string;
  id: string;
  source: string;
  sprint: string;
  sprintId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  time: string;
  createdAt: string;
  promptMarkdown: string;
  description: string;
  dependsOnTaskIds: string[];
  isIndependent: boolean;
  isMerged: boolean;
  mergeIndicator: string | null;
}

export type {
  CreateProjectInput,
  CreateSprintInput,
  CreateTaskInput,
  ProjectCollectionResponse,
  ProjectStatus,
  ProjectSummary,
  SprintMarkdownExportBundle,
  SprintMarkdownImportInput,
  SprintMarkdownImportTask,
  SprintRecord,
  SprintStatus,
  TaskPriority,
  TaskRecord,
  TaskStatus,
  UpdateProjectInput,
  UpdateSprintInput,
  UpdateTaskInput,
};
