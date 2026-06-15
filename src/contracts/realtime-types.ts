export type DashboardRealtimeScopeType = "overview" | "projects" | "project" | "thread";

export interface DashboardRealtimeEvent {
  sequence: number;
  emittedAt: string;
  scopeType: DashboardRealtimeScopeType;
  scopeId: string;
  scope: string;
  eventType: string;
  entityType: string;
  entityId: string;
  projectId: string | null;
  sprintId: string | null;
  threadId: string | null;
  taskId: string | null;
  dispatchId: string | null;
  sprintRunId: string | null;
  taskRunId: string | null;
  connectionId: string | null;
  correlationId: string | null;
  payload: unknown;
}

export interface DashboardRealtimeSetSubscriptionsMessage {
  type: "set_subscriptions";
  scopes: string[];
  lastSequence?: number | null;
}

export interface DashboardRealtimeReadyMessage {
  type: "ready";
}

export interface DashboardRealtimeSubscribedMessage {
  type: "subscribed";
  scopes: string[];
  lastSequence: number | null;
}

export interface DashboardRealtimeEventMessage {
  type: "event";
  event: DashboardRealtimeEvent;
}

export interface DashboardRealtimeSnapshotRequiredMessage {
  type: "snapshot_required";
  reason: string;
}

export type DashboardRealtimeServerMessage =
  | DashboardRealtimeReadyMessage
  | DashboardRealtimeSubscribedMessage
  | DashboardRealtimeEventMessage
  | DashboardRealtimeSnapshotRequiredMessage;

export type DashboardRealtimeClientMessage = DashboardRealtimeSetSubscriptionsMessage;
