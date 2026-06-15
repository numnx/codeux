export interface GitSettings {
  githubMode: "REMOTE" | "LOCAL";
  githubToken: string;
  gitlabToken?: string;
  defaultBranch: string;
  autoCreatePr: boolean;
  autoCloseLinkedIssues: boolean;
  featureBranchPrefix: string;
  sprintBranchScheme: string;
  sprintKeyPrefix: string;
}

export interface GitStatusCheck {
  name: string;
  status: string;
  conclusion: string | null;
}

export interface GitPullRequestStatus {
  number: number;
  title: string;
  url: string;
  state: string;
  isDraft: boolean;
  headRefName: string | null;
  baseRefName: string | null;
  mergeStateStatus: string | null;
  reviewDecision: string | null;
  updatedAt: string | null;
  comments: number;
  checks: GitStatusCheck[];
}

export interface GitCiRunStatus {
  id: number | null;
  name: string;
  workflowName: string | null;
  status: string;
  conclusion: string | null;
  event: string | null;
  headBranch: string | null;
  url: string;
  updatedAt: string | null;
  failedJobs?: GitCiFailedJob[];
}

export interface GitCiFailedJob {
  id: number | null;
  name: string;
  conclusion: string | null;
  failedSteps: string[];
  logExcerpt: string | null;
  logCommand: string | null;
}

export interface GitMergeStatus {
  number: number;
  title: string;
  url: string;
  headRefName: string | null;
  baseRefName: string | null;
  mergedAt: string | null;
  mergedBy: string | null;
}

export type GitTrackingScope = "FEATURE_PR_CI" | "MAIN_MERGE_PR_CI" | "MAIN_BRANCH_CI" | "REPOSITORY";

export interface GitTrackingTarget {
  scope: GitTrackingScope;
  label: string;
  branch: string | null;
}

export interface GitTrackingStatus {
  mode: "REMOTE" | "LOCAL";
  available: boolean;
  repositoryRoot: string | null;
  branch: string | null;
  hasRemote: boolean;
  dirty: boolean;
  openPullRequests: GitPullRequestStatus[];
  ciRuns: GitCiRunStatus[];
  mergedPullRequests: GitMergeStatus[];
  tracking: GitTrackingTarget;
  warnings: string[];
  lastUpdated: string;
}

export interface GetCiStatusForScopeArgs {
  repoPath: string;
  scope: "FEATURE_PR_CI" | "MAIN_MERGE_PR_CI" | "MAIN_BRANCH_CI";
  featureBranch: string;
  defaultBranch: string;
  featureBranchPrefix: string;
  taskPrUrls?: string[];
  cacheTtlMs?: number;
}

export interface AutoMergeFeaturePrArgs {
  repoPath: string;
  prNumber: number;
}

export interface AutoMergeFeaturePrResult {
  ok: boolean;
  merged?: boolean;
  autoMergeScheduled?: boolean;
  mergeConflict?: boolean;
  message?: string;
}
