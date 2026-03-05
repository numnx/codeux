import { ProjectId, SprintId, SprintStatus } from "../../contracts/app-types.js";

export interface Sprint {
  id: SprintId;
  projectId: ProjectId;
  name: string;
  goal: string | null;
  status: SprintStatus | "ARCHIVED";
  startDate: string | null;
  endDate: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateSprintInput = Omit<Sprint, "id" | "status" | "createdAt" | "updatedAt" | "orderIndex">;
export type UpdateSprintInput = Partial<Omit<Sprint, "id" | "projectId" | "createdAt" | "updatedAt">>;
