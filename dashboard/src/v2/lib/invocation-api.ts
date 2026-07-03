import type { ExecutionInvocationRecord, ExecutionInvocationMessageRecord, ProjectInvocationsQuery, ProjectInvocationsQueryResult, ExecutionInvocationMessagesQueryResult, InvocationMessagesQuery } from "../types.js";
import { fetchJson } from "../../lib/api/fetch-json.js";

export function fetchProjectInvocations(projectId: string, query?: undefined, init?: RequestInit): Promise<ExecutionInvocationRecord[]>;
export function fetchProjectInvocations(projectId: string, query: ProjectInvocationsQuery, init?: RequestInit): Promise<ProjectInvocationsQueryResult>;
export async function fetchProjectInvocations(
  projectId: string,
  query?: ProjectInvocationsQuery,
  init?: RequestInit
): Promise<ExecutionInvocationRecord[] | ProjectInvocationsQueryResult> {
  if (query) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          for (const item of value) {
            searchParams.append(key, String(item));
          }
        } else {
          searchParams.set(key, String(value));
        }
      }
    }
    return fetchJson<ProjectInvocationsQueryResult>(
      `/api/projects/${encodeURIComponent(projectId)}/execution/invocations?${searchParams.toString()}`,
      init
    );
  }

  return fetchJson<ExecutionInvocationRecord[]>(`/api/projects/${encodeURIComponent(projectId)}/execution/invocations`, init);
}

export const fetchProjectInvocationsQuery = async (
  projectId: string,
  query: ProjectInvocationsQuery,
  init?: RequestInit
): Promise<ProjectInvocationsQueryResult> => {
  return fetchProjectInvocations(projectId, query, init) as Promise<ProjectInvocationsQueryResult>;
};

export function fetchInvocationMessages(invocationId: string): Promise<ExecutionInvocationMessageRecord[]>;
export function fetchInvocationMessages(invocationId: string, query: InvocationMessagesQuery): Promise<ExecutionInvocationMessagesQueryResult>;
export async function fetchInvocationMessages(invocationId: string, query?: InvocationMessagesQuery): Promise<ExecutionInvocationMessageRecord[] | ExecutionInvocationMessagesQueryResult> {
  if (query) {
    const searchParams = new URLSearchParams();
    if (query.limit !== undefined) {
      searchParams.set("limit", String(query.limit));
    }
    if (query.offset !== undefined) {
      searchParams.set("offset", String(query.offset));
    }
    return fetchJson<ExecutionInvocationMessagesQueryResult>(`/api/execution/invocations/${encodeURIComponent(invocationId)}/messages?${searchParams.toString()}`);
  }
  return fetchJson<ExecutionInvocationMessageRecord[]>(`/api/execution/invocations/${encodeURIComponent(invocationId)}/messages`);
}
