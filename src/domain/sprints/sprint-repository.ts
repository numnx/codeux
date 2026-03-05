import { ProjectId, SprintId, SprintStatus } from "../../contracts/app-types.js";
import { CreateSprintInput, Sprint, UpdateSprintInput } from "./sprint-types.js";

export interface SprintRepository {
  create(input: CreateSprintInput): Promise<Sprint>;
  getById(id: SprintId): Promise<Sprint | null>;
  listByProjectId(projectId: ProjectId): Promise<Sprint[]>;
  update(id: SprintId, input: UpdateSprintInput): Promise<Sprint>;
  delete(id: SprintId): Promise<void>;
  archive(id: SprintId): Promise<Sprint>;
  reorder(projectId: ProjectId, orderedSprintIds: SprintId[]): Promise<void>;
}
