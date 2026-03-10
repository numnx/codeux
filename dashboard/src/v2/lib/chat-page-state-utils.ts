import type { ChatThread } from "../types.js";

export const resolveSelectedThreadId = (
  threads: ChatThread[],
  currentSelectedThreadId: string | null,
): string | null => {
  if (currentSelectedThreadId && threads.some((thread) => thread.id === currentSelectedThreadId)) {
    return currentSelectedThreadId;
  }

  return threads[0]?.id || null;
};

export const isThreadListLoading = (
  selectedProjectId: string | null,
  loadedProjectId: string | null,
  loading: boolean,
): boolean => Boolean(selectedProjectId) && (loading || loadedProjectId !== selectedProjectId);

export const isThreadMessagesLoading = (
  selectedThreadId: string | null,
  loadedThreadId: string | null,
  loading: boolean,
): boolean => Boolean(selectedThreadId) && (loading || loadedThreadId !== selectedThreadId);
