import { describe, it, expect, vi, beforeEach } from "vitest";
import { JulesUsageService } from "../../../src/domain/jules/jules-usage-service.js";
import type { JulesClient } from "../../../src/domain/jules/jules-client.js";
import type { ExecutionRepository } from "../../../src/repositories/execution-repository.js";
import type { Logger } from "../../../src/shared/logging/logger.js";
import type { JulesActivity } from "../../../src/contracts/app-types.js";
import { getEncoding } from "js-tiktoken";

describe("JulesUsageService", () => {
  let julesClientMock: ReturnType<typeof vi.fn>;
  let julesClientGetSessionMock: ReturnType<typeof vi.fn>;
  
  let executionRepositoryGetLatestMock: ReturnType<typeof vi.fn>;
  let executionRepositoryCreateMock: ReturnType<typeof vi.fn>;
  let executionRepositoryUpdateMock: ReturnType<typeof vi.fn>;
  let listExecutionInvocationsMock: ReturnType<typeof vi.fn>;
  let createExecutionInvocationMock: ReturnType<typeof vi.fn>;
  let updateExecutionInvocationMock: ReturnType<typeof vi.fn>;
  let clearExecutionInvocationMessagesMock: ReturnType<typeof vi.fn>;
  let appendExecutionInvocationMessageMock: ReturnType<typeof vi.fn>;
  
  let loggerInfoMock: ReturnType<typeof vi.fn>;
  let loggerErrorMock: ReturnType<typeof vi.fn>;

  let julesClient: JulesClient;
  let executionRepository: ExecutionRepository;
  let logger: Logger;
  let service: JulesUsageService;

  beforeEach(() => {
    julesClientMock = vi.fn();
    julesClientGetSessionMock = vi.fn().mockResolvedValue({ prompt: "Initial prompt for testing" });
    loggerInfoMock = vi.fn();
    loggerErrorMock = vi.fn();
    
    executionRepositoryGetLatestMock = vi.fn().mockReturnValue(null);
    executionRepositoryCreateMock = vi.fn().mockReturnValue({ id: "mock-record-id", createdAt: "2026-05-21T07:29:52.209Z" });
    executionRepositoryUpdateMock = vi.fn();
    listExecutionInvocationsMock = vi.fn().mockReturnValue([]);
    createExecutionInvocationMock = vi.fn().mockReturnValue({ id: "mock-exec-id" });
    updateExecutionInvocationMock = vi.fn();
    clearExecutionInvocationMessagesMock = vi.fn();
    appendExecutionInvocationMessageMock = vi.fn();

    julesClient = {
      getFullConversation: julesClientMock,
      getSession: julesClientGetSessionMock
    } as unknown as JulesClient;

    executionRepository = {
      getLatestProviderInvocationUsageBySession: executionRepositoryGetLatestMock,
      createProviderInvocationUsage: executionRepositoryCreateMock,
      updateProviderInvocationUsage: executionRepositoryUpdateMock,
      listExecutionInvocationsByProviderInvocationId: listExecutionInvocationsMock,
      createExecutionInvocation: createExecutionInvocationMock,
      updateExecutionInvocation: updateExecutionInvocationMock,
      clearExecutionInvocationMessages: clearExecutionInvocationMessagesMock,
      appendExecutionInvocationMessage: appendExecutionInvocationMessageMock,
    } as unknown as ExecutionRepository;

    logger = {
      info: loggerInfoMock,
      error: loggerErrorMock,
      debug: vi.fn(),
      warn: vi.fn(),
      child: vi.fn().mockReturnThis()
    } as unknown as Logger;

    service = new JulesUsageService(julesClient, executionRepository, logger);
  });

  it("should calculate tokens and save usage successfully", async () => {
    const mockActivities: JulesActivity[] = [
      { id: "1", name: "1", createTime: "now", userMessaged: { userMessage: "Hello Jules" } },
      { id: "2", name: "2", createTime: "now", agentMessaged: { agentMessage: "Hello! How can I help?" } }
    ];

    julesClientMock.mockResolvedValue(mockActivities);

    await service.calculateAndSaveUsageForTask("proj-1", "task-1", "session-1");

    expect(julesClientMock).toHaveBeenCalledWith("session-1");
    expect(julesClientGetSessionMock).toHaveBeenCalledWith("session-1");

    expect(executionRepositoryGetLatestMock).toHaveBeenCalledWith("session-1", "task_coding");

    expect(executionRepositoryCreateMock).toHaveBeenCalledWith({
      projectId: "proj-1",
      taskId: "task-1",
      sessionId: "session-1",
      provider: "jules",
      purpose: "task_coding",
      status: "completed",
      invocationSource: "EXTERNAL_API"
    });

    const encoder = getEncoding("cl100k_base");
    const expectedInitialTokens = encoder.encode("Initial prompt for testing").length;
    const expectedInputTokens = expectedInitialTokens + encoder.encode("Hello Jules").length;
    const expectedOutputTokens = encoder.encode("Hello! How can I help?").length;

    expect(executionRepositoryUpdateMock).toHaveBeenCalledWith("mock-record-id", {
      status: "completed",
      inputTokens: expectedInputTokens,
      outputTokens: expectedOutputTokens,
      totalTokens: expectedInputTokens + expectedOutputTokens,
      julesTokens: expectedInputTokens + expectedOutputTokens,
      usageSource: "estimated",
      transcriptChars: "Hello! How can I help?".length,
      invocationSource: "EXTERNAL_API",
      rawUsageJson: {
        gitMetrics: {
          insertions: 0,
          deletions: 0,
          filesChanged: 0
        }
      }
    });

    // Check ExecutionInvocationRecord and messages
    expect(createExecutionInvocationMock).toHaveBeenCalledWith({
      projectId: "proj-1",
      taskId: "task-1",
      providerInvocationId: "mock-record-id",
      type: "task_coding",
      status: "completed",
      provider: "jules",
      model: "jules-agent",
      invocationSource: "EXTERNAL_API",
      startedAt: "2026-05-21T07:29:52.209Z"
    });

    expect(clearExecutionInvocationMessagesMock).toHaveBeenCalledWith("mock-exec-id");
    
    // Initial prompt + mockActivities user/agent messages
    expect(appendExecutionInvocationMessageMock).toHaveBeenCalledTimes(3);

    expect(loggerInfoMock).toHaveBeenCalledWith("Saved Jules usage telemetry and conversation transcript for task", expect.any(Object));
  });

  it("should be idempotent and update existing usage if record already exists", async () => {
    const mockActivities: JulesActivity[] = [
      { id: "1", name: "1", createTime: "now", userMessaged: { userMessage: "Hello Jules" } },
    ];
    julesClientMock.mockResolvedValue(mockActivities);

    executionRepositoryGetLatestMock.mockReturnValue({ id: "existing-record-id", createdAt: "2026-05-21T07:29:52.209Z" });
    listExecutionInvocationsMock.mockReturnValue([{ id: "existing-exec-id" }]);

    await service.calculateAndSaveUsageForTask("proj-1", "task-1", "session-1");

    expect(executionRepositoryGetLatestMock).toHaveBeenCalledWith("session-1", "task_coding");
    expect(executionRepositoryCreateMock).not.toHaveBeenCalled();

    const encoder = getEncoding("cl100k_base");
    const expectedInitialTokens = encoder.encode("Initial prompt for testing").length;
    const expectedInputTokens = expectedInitialTokens + encoder.encode("Hello Jules").length;

    expect(executionRepositoryUpdateMock).toHaveBeenCalledWith("existing-record-id", {
      status: "completed",
      inputTokens: expectedInputTokens,
      outputTokens: 0,
      totalTokens: expectedInputTokens,
      julesTokens: expectedInputTokens,
      usageSource: "estimated",
      transcriptChars: 0,
      invocationSource: "EXTERNAL_API",
      rawUsageJson: {
        gitMetrics: {
          insertions: 0,
          deletions: 0,
          filesChanged: 0
        }
      }
    });

    expect(updateExecutionInvocationMock).toHaveBeenCalledWith("existing-exec-id", expect.objectContaining({
      status: "completed"
    }));
  });

  it("should extract git code churn and factor it into output tokens and rawUsageJson", async () => {
    const mockActivities: JulesActivity[] = [
      { id: "1", name: "1", createTime: "now", userMessaged: { userMessage: "Hello Jules" } },
    ];
    julesClientMock.mockResolvedValue(mockActivities);

    julesClientGetSessionMock.mockResolvedValue({
      prompt: "Initial prompt for testing",
      outputs: [
        {
          pullRequest: {
            url: "https://example.com/pr/123",
            workerBranch: "feature-branch",
            filesChanged: 4,
            insertions: 50,
            deletions: 20
          }
        }
      ]
    });

    await service.calculateAndSaveUsageForTask("proj-1", "task-1", "session-1");

    const encoder = getEncoding("cl100k_base");
    const expectedInitialTokens = encoder.encode("Initial prompt for testing").length;
    const expectedInputTokens = expectedInitialTokens + encoder.encode("Hello Jules").length;

    // git insertions (50) + git deletions (20) = 70 lines.
    // 70 lines * 10 tokens/line = 700 churn tokens.
    const expectedOutputTokens = 700;

    expect(executionRepositoryUpdateMock).toHaveBeenCalledWith("mock-record-id", {
      status: "completed",
      inputTokens: expectedInputTokens,
      outputTokens: expectedOutputTokens,
      totalTokens: expectedInputTokens + expectedOutputTokens,
      julesTokens: expectedInputTokens + expectedOutputTokens,
      usageSource: "estimated",
      transcriptChars: 0,
      invocationSource: "EXTERNAL_API",
      rawUsageJson: {
        gitMetrics: {
          insertions: 50,
          deletions: 20,
          filesChanged: 4
        }
      }
    });
  });

  it("should handle API failure gracefully and log an error", async () => {
    julesClientMock.mockRejectedValue(new Error("API Error"));

    await service.calculateAndSaveUsageForTask("proj-1", "task-1", "session-1");

    expect(executionRepositoryCreateMock).not.toHaveBeenCalled();
    expect(loggerErrorMock).toHaveBeenCalledWith("Failed to calculate and save Jules usage telemetry", expect.objectContaining({
      projectId: "proj-1",
      taskId: "task-1",
      sessionId: "session-1",
      error: expect.any(Error)
    }));
  });

  it("should skip remote API calls and early-return if a record with totalTokens already exists", async () => {
    executionRepositoryGetLatestMock.mockReturnValue({
      id: "existing-record-id",
      createdAt: "2026-05-21T07:29:52.209Z",
      totalTokens: 1500
    });

    await service.calculateAndSaveUsageForTask("proj-1", "task-1", "session-1");

    expect(executionRepositoryGetLatestMock).toHaveBeenCalledWith("session-1", "task_coding");
    expect(julesClientMock).not.toHaveBeenCalled();
    expect(julesClientGetSessionMock).not.toHaveBeenCalled();
    expect(executionRepositoryCreateMock).not.toHaveBeenCalled();
    expect(executionRepositoryUpdateMock).not.toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledWith("Jules usage telemetry already calculated and saved for session", { sessionId: "session-1" });
  });
});
