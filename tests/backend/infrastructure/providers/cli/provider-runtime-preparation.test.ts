import { describe, expect, it } from "vitest";
import { prepareProviderRuntime } from "../../../../../src/infrastructure/providers/cli/provider-runtime-preparation.js";
import { CONTAINER_QWEN_OPENAI_LOG_DIR, resolveQwenHostLogDir, resolveAntigravityContainerLogPath, resolveAntigravityHostLogPath } from "../../../../../src/infrastructure/providers/cli/provider-runtime-artifacts.js";

describe("ProviderRuntimePreparation", () => {
  it("resolves nativeSessionId correctly for different providers", () => {
    const baseInput = {
      model: "default",
      apiKey: "key",
      sessionId: "session-1",
      workflowSettings: { executionMode: "HOST" } as any,
    };

    const qwen = prepareProviderRuntime({ ...baseInput, provider: "qwen-code" });
    expect(qwen.nativeSessionId).toBeNull();

    const claude = prepareProviderRuntime({ ...baseInput, provider: "claude-code" });
    expect(claude.nativeSessionId).toBeTruthy();

    const claudeContinue = prepareProviderRuntime({ ...baseInput, provider: "claude-code", continueSessionId: "existing-1" });
    expect(claudeContinue.nativeSessionId).toBe("existing-1");

    const opencode = prepareProviderRuntime({ ...baseInput, provider: "opencode", continueSessionId: "ses_123" });
    expect(opencode.nativeSessionId).toBe("ses_123");
  });

  it("resolves qwenProcessLogDir based on execution mode", () => {
    const dockerInput = {
      provider: "qwen-code",
      model: "default",
      apiKey: "key",
      sessionId: "session-1",
      workflowSettings: { executionMode: "DOCKER" } as any,
    } as any;

    const dockerResult = prepareProviderRuntime(dockerInput);
    expect(dockerResult.qwenProcessLogDir).toBe(CONTAINER_QWEN_OPENAI_LOG_DIR);

    const hostInput = { ...dockerInput, workflowSettings: { executionMode: "HOST" } };
    const hostResult = prepareProviderRuntime(hostInput);
    expect(hostResult.qwenProcessLogDir).toBe(resolveQwenHostLogDir("session-1"));
  });

  it("resolves antigravityLogPath based on execution mode", () => {
    const dockerInput = {
      provider: "antigravity",
      model: "default",
      apiKey: "key",
      sessionId: "session-1",
      workflowSettings: { executionMode: "DOCKER" } as any,
    } as any;

    const dockerResult = prepareProviderRuntime(dockerInput);
    expect(dockerResult.antigravityLogPath).toBe(resolveAntigravityContainerLogPath("session-1"));

    const hostInput = { ...dockerInput, workflowSettings: { executionMode: "HOST" } };
    const hostResult = prepareProviderRuntime(hostInput);
    expect(hostResult.antigravityLogPath).toBe(resolveAntigravityHostLogPath("session-1"));
  });

  it("constructs environment variables correctly without leaking secrets", () => {
    const geminiInput = {
      provider: "gemini",
      model: "gemini-pro",
      apiKey: "fake-gemini-key",
      sessionId: "session-1",
      workflowSettings: { executionMode: "HOST" } as any,
    } as any;

    const geminiResult = prepareProviderRuntime(geminiInput);
    expect(geminiResult.providerEnv.GEMINI_MODEL).toBe("gemini-pro");
    expect(geminiResult.providerEnv.GEMINI_API_KEY).toBe("fake-gemini-key");
    expect(geminiResult.providerEnv.GEMINI_CLI_TRUST_WORKSPACE).toBe("true");

    const antigravityInput = {
      provider: "antigravity",
      model: "agy-model-1",
      apiKey: "fake-agy-key",
      sessionId: "session-1",
      workflowSettings: { executionMode: "HOST" } as any,
    } as any;

    const agyResult = prepareProviderRuntime(antigravityInput);
    expect(agyResult.providerEnv.ANTIGRAVITY_MODEL).toBe("agy-model-1");
    expect(agyResult.providerEnv.AGY_MODEL).toBe("agy-model-1");
    expect(agyResult.providerEnv.ANTIGRAVITY_API_KEY).toBe("fake-agy-key");
  });
});
