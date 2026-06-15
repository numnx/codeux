import type { ProviderId } from "./provider-types.js";

export interface JulesSource {
  name: string;
  id: string;
  [key: string]: unknown;
}

export interface JulesSession {
  name: string;
  id: string;
  title?: string;
  state?: string;
  provider?: ProviderId;
  prompt: string;
  createTime?: string;
  outputs?: SessionOutput[];
}

export interface JulesActivityArtifact {
  changeSet?: {
    source?: string;
    gitPatch?: {
      unidiffPatch?: string;
      baseCommitId?: string;
      suggestedCommitMessage?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  media?: {
    data?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface JulesActivity {
  name: string;
  id: string;
  createTime: string;
  originator?: "agent" | "user" | "system" | string;
  agentMessaged?: { agentMessage?: string };
  userMessaged?: { userMessage?: string };
  progressUpdated?: { title?: string; description?: string };
  planGenerated?: { plan?: { steps?: Array<{ title?: string }> } };
  planApproved?: { planId?: string };
  sessionFailed?: { reason?: string };
  sessionCompleted?: unknown;
  description?: string;
  artifacts?: JulesActivityArtifact[];
  [key: string]: unknown;
}

export interface PullRequestOutput {
  url?: string;
  workerBranch?: string;
  [key: string]: unknown;
}

export interface SessionOutput {
  pullRequest?: PullRequestOutput;
  [key: string]: unknown;
}
