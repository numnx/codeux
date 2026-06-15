import { randomUUID } from "crypto";
import type { DashboardSettings, ProviderId } from "../../contracts/app-types.js";
import { sanitizeToken } from "../cli-workflow-utils.js";
import type { WorkerEndpointRepository } from "../../repositories/worker-endpoint-repository.js";
import type { ProjectWorkerAssignmentService } from "../../domain/workers/project-worker-assignment-service.js";

import type { ProjectWorkerAssignmentRepository } from "../../repositories/project-worker-assignment-repository.js";

export class VirtualWorkerProvisioning {
  constructor(
    private readonly workerEndpointRepository: WorkerEndpointRepository,
    private readonly projectWorkerAssignmentService: ProjectWorkerAssignmentService,
    private readonly projectWorkerAssignmentRepository: ProjectWorkerAssignmentRepository
  ) {}

  provisionWorker(projectId: string, cycleSettings: DashboardSettings): { endpointId: string, cleanup: () => void } {
    const cycleProviderType = cycleSettings.aiProvider.providers[cycleSettings.workers.virtualWorkerProvider]?.provider || "codex";
    const endpoint = this.workerEndpointRepository.createVirtualEndpoint({
      endpointKey: `virtual:${projectId}:${Date.now().toString(36)}:${sanitizeToken(randomUUID().slice(0, 8))}`,
      displayName: `Virtual ${this.getProviderLabel(cycleProviderType)} Worker`,
      status: "connected",
      transport: "internal",
      capabilities: {
        canSuperviseProjects: true,
        canExecuteTasks: true,
      },
    });

    this.projectWorkerAssignmentService.ensureWorkerAssignment(projectId, endpoint.id);

    return {
      endpointId: endpoint.id,
      cleanup: () => {
        this.projectWorkerAssignmentService.releaseWorkerAssignment(projectId, endpoint.id, "virtual_worker_cycle_complete");
        this.workerEndpointRepository.deleteWorkerEndpoint(endpoint.id);
      }
    };
  }

  cleanupOrphanedVirtualWorkers(): void {
    const orphaned = this.workerEndpointRepository.listWorkerEndpoints()
      .filter((endpoint) => endpoint.endpointType === "virtual_cli");

    for (const endpoint of orphaned) {
      for (const assignment of this.projectWorkerAssignmentRepository.listActiveAssignmentsForWorker(endpoint.id)) {
        this.projectWorkerAssignmentService.releaseWorkerAssignment(assignment.projectId, endpoint.id, "virtual_worker_startup_prune");
      }
      this.workerEndpointRepository.deleteWorkerEndpoint(endpoint.id);
    }
  }

  getProviderLabel(provider: ProviderId | string): string {
    switch (provider) {
      case "claude-code":
        return "Claude Code";
      case "qwen-code":
        return "Qwen Code";
      case "opencode":
        return "OpenCode";
      case "gemini":
        return "Gemini";
      case "codex":
      default:
        return "Codex";
    }
  }
}
