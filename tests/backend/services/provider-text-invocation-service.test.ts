import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderTextInvocationService } from "../../../src/services/provider-text-invocation-service.js";

describe("ProviderTextInvocationService", () => {
  const mockRunProviderForText = vi.fn();
  const mockExecutionRepository = {
    createExecutionInvocation: vi.fn(),
    appendExecutionInvocationMessage: vi.fn(),
    updateExecutionInvocation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRunProviderForText.mockReset();
  });

  const getService = () => new ProviderTextInvocationService({
    executionRepository: mockExecutionRepository as any,
    providerRunner: { runProviderForText: mockRunProviderForText } as any,
  });

  const defaultInput = {
    projectId: "project-1",
    type: "test_invocation",
    provider: "gemini" as const,
    model: "gemini-test",
    prompt: "Hello, world!",
    repoPath: "/repo",
    apiKey: "api-key",
    workflowSettings: {} as any,
  };

  it("successfully runs a provider for text and handles the execution invocation lifecycle", async () => {
    mockExecutionRepository.createExecutionInvocation.mockReturnValue({ id: "exec-1" });
    mockRunProviderForText.mockResolvedValue({
      text: "Response text",
      nativeSessionId: "native-123",
    });

    const service = getService();
    const result = await service.runProviderForText(defaultInput);

    expect(result.text).toBe("Response text");
    expect(result.nativeSessionId).toBe("native-123");

    expect(mockExecutionRepository.createExecutionInvocation).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        type: "test_invocation",
        provider: "gemini",
        model: "gemini-test",
        attentionItemId: null,
        dispatchId: null,
      })
    );

    expect(mockExecutionRepository.appendExecutionInvocationMessage).toHaveBeenNthCalledWith(1, "exec-1", {
      role: "user",
      contentMarkdown: "Hello, world!",
    });

    expect(mockRunProviderForText).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "gemini",
        prompt: "Hello, world!",
        cwd: "/repo",
        model: "gemini-test",
        apiKey: "api-key",
      })
    );

    expect(mockExecutionRepository.appendExecutionInvocationMessage).toHaveBeenNthCalledWith(2, "exec-1", {
      role: "assistant",
      contentMarkdown: "Response text",
    });

    expect(mockExecutionRepository.updateExecutionInvocation).toHaveBeenCalledWith("exec-1", {
      status: "completed",
      finishedAt: expect.any(String),
    });
  });

  it("handles provider failure and sets invocation status to failed", async () => {
    mockExecutionRepository.createExecutionInvocation.mockReturnValue({ id: "exec-2" });
    mockRunProviderForText.mockRejectedValue(new Error("Provider failed"));

    const service = getService();

    await expect(service.runProviderForText(defaultInput)).rejects.toThrow("Provider failed");

    expect(mockExecutionRepository.createExecutionInvocation).toHaveBeenCalled();
    expect(mockExecutionRepository.appendExecutionInvocationMessage).toHaveBeenCalledWith("exec-2", {
      role: "user",
      contentMarkdown: "Hello, world!",
    });

    expect(mockExecutionRepository.updateExecutionInvocation).toHaveBeenCalledWith("exec-2", {
      status: "failed",
      finishedAt: expect.any(String),
    });

    expect(mockExecutionRepository.appendExecutionInvocationMessage).not.toHaveBeenCalledWith("exec-2", {
      role: "assistant",
      contentMarkdown: expect.any(String),
    });
  });

  it("throws an error if the provider returns an empty reply", async () => {
    mockExecutionRepository.createExecutionInvocation.mockReturnValue({ id: "exec-3" });
    mockRunProviderForText.mockResolvedValue({
      text: "   ",
      nativeSessionId: "native-123",
    });

    const service = getService();

    await expect(service.runProviderForText(defaultInput)).rejects.toThrow("Provider gemini returned an empty reply.");

    expect(mockExecutionRepository.createExecutionInvocation).toHaveBeenCalled();
    expect(mockExecutionRepository.updateExecutionInvocation).toHaveBeenCalledWith("exec-3", {
      status: "completed",
      finishedAt: expect.any(String),
    });
  });

  it("unwraps JSON response strings correctly", async () => {
    mockExecutionRepository.createExecutionInvocation.mockReturnValue({ id: "exec-4" });
    mockRunProviderForText.mockResolvedValue({
      text: '{"response": "Extracted response content"}',
      nativeSessionId: "native-456",
    });

    const service = getService();
    const result = await service.runProviderForText(defaultInput);

    expect(result.text).toBe("Extracted response content");
    expect(mockExecutionRepository.appendExecutionInvocationMessage).toHaveBeenCalledWith("exec-4", {
      role: "assistant",
      contentMarkdown: "Extracted response content",
    });
  });
});
