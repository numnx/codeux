export type SystemSortKey = "startedAt" | "inputTokens" | "outputTokens" | "totalTokens" | "durationMs";

export interface SystemSort {
  key: SystemSortKey;
  dir: "asc" | "desc";
}
