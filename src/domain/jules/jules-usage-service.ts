import { getEncoding } from "js-tiktoken";
import type { JulesClient } from "./jules-client.js";
import type { ExecutionRepository } from "../../repositories/execution-repository.js";
import type { Logger } from "../../shared/logging/logger.js";
import type { CreateProviderInvocationUsageInput, UpdateProviderInvocationUsageInput } from "../../contracts/execution-types.js";

export class JulesUsageService {
  constructor(
    private readonly julesClient: JulesClient,
    private readonly executionRepository: ExecutionRepository,
    private readonly logger: Logger
  ) {}

  async calculateAndSaveUsageForTask(projectId: string, taskId: string, sessionId: string): Promise<void> {
    try {
      const activities = await this.julesClient.getFullConversation(sessionId);

      let inputTokens = 0;
      let outputTokens = 0;
      let promptChars = 0;
      let transcriptChars = 0;

      const encoder = getEncoding("cl100k_base");

      for (const activity of activities) {
        if (activity.userMessaged?.userMessage) {
          const text = activity.userMessaged.userMessage;
          promptChars += text.length;
          inputTokens += encoder.encode(text).length;
        }
        if (activity.agentMessaged?.agentMessage) {
          const text = activity.agentMessaged.agentMessage;
          transcriptChars += text.length;
          outputTokens += encoder.encode(text).length;
        }
      }

      const totalTokens = inputTokens + outputTokens;

      let record = this.executionRepository.getLatestProviderInvocationUsageBySession(sessionId, "task_coding");

      if (!record) {
        const createInput: CreateProviderInvocationUsageInput = {
          projectId,
          taskId,
          sessionId,
          provider: "jules",
          purpose: "task_coding"
        };
        record = this.executionRepository.createProviderInvocationUsage(createInput);
      }

      const updateInput: UpdateProviderInvocationUsageInput = {
        status: "completed",
        inputTokens,
        outputTokens,
        totalTokens,
        usageSource: "estimated",
        transcriptChars
      };

      this.executionRepository.updateProviderInvocationUsage(record.id, updateInput);

      this.logger.info("Saved Jules usage telemetry for task", {
        projectId,
        taskId,
        sessionId,
        inputTokens,
        outputTokens,
        totalTokens
      });

    } catch (error) {
      this.logger.error("Failed to calculate and save Jules usage telemetry", {
        error,
        projectId,
        taskId,
        sessionId
      });
    }
  }
}
