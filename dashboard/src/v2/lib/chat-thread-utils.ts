import type { ChatThread } from "../types.js";

export const upsertChatThread = (threads: ChatThread[], nextThread: ChatThread): ChatThread[] => {
  const withoutCurrent = threads.filter((thread) => thread.id !== nextThread.id);
  return [nextThread, ...withoutCurrent].sort((left, right) => {
    const leftTime = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : new Date(left.updatedAt).getTime();
    const rightTime = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : new Date(right.updatedAt).getTime();
    return rightTime - leftTime;
  });
};
