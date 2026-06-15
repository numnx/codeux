export interface ActivitySummary {
  id: string;
  name: string;
  createTime: string;
  originator: string;
  kind: string;
  preview?: string;
  [key: string]: unknown;
}
