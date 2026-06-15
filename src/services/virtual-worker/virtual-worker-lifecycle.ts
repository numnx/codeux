import type { JulesSession } from "../../contracts/app-types.js";
import type { ProjectAttentionItemRecord } from "../../contracts/project-attention-types.js";
import type { SessionTrackingRepository } from "../../repositories/session-tracking-repository.js";
import type { WorkerEndpointRepository } from "../../repositories/worker-endpoint-repository.js";

const VIRTUAL_WORKER_SESSION_POLL_MS = 2_000;

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTerminalSessionState(state: string | undefined): boolean {
  return state === "COMPLETED" || state === "FAILED" || state === "CANCELLED" || state === "QUOTA" || state === "RATE_LIMITED";
}

export function resolveTerminalDispatchState(session: JulesSession, extractPullRequest: (session: JulesSession) => { url?: string; workerBranch?: string } | null): "COMPLETED" | "FAILED" | "QUOTA" | null {
  if (session.state === "QUOTA") {
    return "QUOTA";
  }
  if (session.state === "RATE_LIMITED") {
    return "QUOTA";
  }
  if (session.state === "FAILED" || session.state === "CANCELLED") {
    return "FAILED";
  }
  if (extractPullRequest(session) || session.state === "COMPLETED") {
    return "COMPLETED";
  }
  return null;
}

export class VirtualWorkerLifecycle {
  constructor(
    private readonly sessionTracking: SessionTrackingRepository,
    private readonly workerEndpointRepository: WorkerEndpointRepository
  ) {}

  async monitorSession(
    workerEndpointId: string,
    sessionId: string,
    pollCallback: (session: JulesSession) => Promise<boolean>
  ): Promise<void> {
    while (true) {
      await sleep(VIRTUAL_WORKER_SESSION_POLL_MS);
      this.workerEndpointRepository.touchWorkerEndpointHeartbeat(workerEndpointId, "connected");

      const currentSession = this.sessionTracking.getSession(sessionId);
      if (!currentSession) {
        return; // Session is gone, stop monitoring
      }

      const shouldStop = await pollCallback(currentSession);
      if (shouldStop) {
        return;
      }
    }
  }

  touchHeartbeat(workerEndpointId: string): void {
    this.workerEndpointRepository.touchWorkerEndpointHeartbeat(workerEndpointId, "connected");
  }

  isOrchestratorHandledClarificationItem(item: ProjectAttentionItemRecord): boolean {
    return item.summaryMarkdown.includes("Clarification cooldown active")
      || item.summaryMarkdown.includes("already answered automatically")
      || item.summaryMarkdown.includes("Resume instruction already sent");
  }
}
