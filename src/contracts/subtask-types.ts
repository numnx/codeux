import type { ProviderId } from "./provider-types.js";
import type { JulesActivity } from "./jules-types.js";
import type { InterventionOwner } from "./dashboard-settings-types.js";

export type SubtaskStatus = "PENDING" | "RUNNING" | "CODING_COMPLETED" | "COMPLETED" | "FAILED" | "BLOCKED" | "QUOTA" | "QA_REVIEW_FAILED";

export type SubtaskMergeIndicator = "CI" | "AUTOMERGE" | "MERGED" | "MERGE_BLOCKED" | "MERGE_CONFLICT" | "PR_ONLY" | "QA_PENDING";

export interface Subtask {
  record_id?: string;
  project_id?: string;
  sprint_id?: string;
  id: string;
  title: string;
  prompt: string;
  depends_on: string[];
  status?: SubtaskStatus;
  session_id?: string;
  session_name?: string;
  session_state?: string;
  provider?: ProviderId;
  model?: string;
  agentPresetId?: string | null;
  worker_branch?: string;
  pr_url?: string;
  activities?: JulesActivity[];
  is_independent: boolean;
  qa_review?: {
    error_reason?: string;
    [key: string]: any;
  };
  latestReview?: {
    status: string;
    outcome: string | null;
    summary: string | null;
    findings: string[];
    reviewer: string | null;
    finishedAt: string | null;
  };
  is_merged?: boolean;
  merge_indicator?: SubtaskMergeIndicator;
  intervention_owner?: InterventionOwner;
  intervention_hint?: string;
}

export interface PersistTaskMergedFlagArgs {
  repoPath: string;
  sprintNumber: number;
  taskId: string;
  merged: boolean;
}
