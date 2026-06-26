import { describe, it, expect } from "vitest";
import { parseOpenCodeJsonLines } from "../../../../../src/infrastructure/providers/cli/provider-logs/opencode-log-parser.js";

/** Builds an `opencode run --format json` NDJSON stream from flattened events. */
function ndjson(events: Array<Record<string, unknown>>): string {
  return events.map((e) => JSON.stringify(e)).join("\n") + "\n";
}

describe("parseOpenCodeJsonLines", () => {
  it("returns null when there are no JSON events", () => {
    expect(parseOpenCodeJsonLines("")).toBeNull();
    expect(parseOpenCodeJsonLines("not json\n\n  ")).toBeNull();
  });

  it("extracts reported usage from step-finish parts (input/output/reasoning/cache)", () => {
    const stream = ndjson([
      { type: "reasoning", part: { type: "reasoning", sessionID: "ses_abc123", text: "thinking about it" } },
      { type: "text", part: { type: "text", sessionID: "ses_abc123", text: "PONG" } },
      {
        type: "step-finish",
        part: {
          type: "step-finish",
          sessionID: "ses_abc123",
          cost: 0.0123,
          tokens: { input: 1500, output: 42, reasoning: 8, cache: { read: 1200, write: 300 } },
        },
      },
    ]);

    const result = parseOpenCodeJsonLines(stream);
    expect(result).not.toBeNull();
    expect(result!.inputTokens).toBe(1500);
    expect(result!.outputTokens).toBe(42);
    expect(result!.reasoningOutputTokens).toBe(8);
    expect(result!.cachedInputTokens).toBe(1200);
    expect(result!.cost).toBeCloseTo(0.0123);
    expect(result!.nativeSessionId).toBe("ses_abc123");
    expect(result!.transcriptText).toBe("PONG");
    expect(result!.rawUsageJson).toEqual({
      tokens: { input: 1500, output: 42, reasoning: 8, cache: { read: 1200, write: 300 } },
      cost: 0.0123,
    });
    expect(result!.conversation.map((t) => t.kind)).toEqual(["reasoning", "assistant"]);
  });

  it("sums usage across multiple step-finish parts (one per LLM call)", () => {
    const stream = ndjson([
      { type: "step-finish", part: { type: "step-finish", cost: 0.01, tokens: { input: 1000, output: 20, reasoning: 0, cache: { read: 0, write: 0 } } } },
      { type: "step-finish", part: { type: "step-finish", cost: 0.02, tokens: { input: 500, output: 30, reasoning: 5, cache: { read: 100, write: 0 } } } },
    ]);

    const result = parseOpenCodeJsonLines(stream)!;
    expect(result.inputTokens).toBe(1500);
    expect(result.outputTokens).toBe(50);
    expect(result.reasoningOutputTokens).toBe(5);
    expect(result.cachedInputTokens).toBe(100);
    expect(result.cost).toBeCloseTo(0.03);
  });

  it("collapses streaming tool parts into one tool_call per callID", () => {
    const stream = ndjson([
      { type: "tool", part: { type: "tool", tool: "bash", callID: "call_1", state: { status: "pending", input: { command: "ls" } } } },
      { type: "tool", part: { type: "tool", tool: "bash", callID: "call_1", state: { status: "completed", input: { command: "ls" }, output: "file.txt" } } },
      { type: "text", part: { type: "text", text: "done" } },
    ]);

    const result = parseOpenCodeJsonLines(stream)!;
    const toolCalls = result.conversation.filter((t) => t.kind === "tool_call");
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].toolName).toBe("bash");
    expect(toolCalls[0].toolStatus).toBe("completed");
    expect(toolCalls[0].toolOutput).toBe("file.txt");
  });

  it("falls back to assistant-message usage when no step-finish parts are present", () => {
    const stream = ndjson([
      { type: "text", part: { type: "text", text: "hi" } },
      // message.updated streams the same message id repeatedly; keep the latest.
      { type: "message.updated", properties: { info: { id: "msg_1", role: "assistant", sessionID: "ses_z9", tokens: { input: 100, output: 5, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 0.001 } } },
      { type: "message.updated", properties: { info: { id: "msg_1", role: "assistant", sessionID: "ses_z9", tokens: { input: 100, output: 11, reasoning: 2, cache: { read: 40, write: 0 } }, cost: 0.004 } } },
    ]);

    const result = parseOpenCodeJsonLines(stream)!;
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(11);
    expect(result.reasoningOutputTokens).toBe(2);
    expect(result.cachedInputTokens).toBe(40);
    expect(result.cost).toBeCloseTo(0.004);
    expect(result.nativeSessionId).toBe("ses_z9");
  });

  it("reports no usage (null rawUsageJson) when the stream carries none", () => {
    const stream = ndjson([
      { type: "text", part: { type: "text", text: "PONG" } },
    ]);
    const result = parseOpenCodeJsonLines(stream)!;
    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
    expect(result.rawUsageJson).toBeNull();
    expect(result.transcriptText).toBe("PONG");
  });

  it("also accepts the nested bus-event shape (properties.part)", () => {
    const stream = ndjson([
      { type: "message.part.updated", properties: { part: { type: "step-finish", sessionID: "ses_nested", tokens: { input: 7, output: 3, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 0 } } },
    ]);
    const result = parseOpenCodeJsonLines(stream)!;
    expect(result.inputTokens).toBe(7);
    expect(result.outputTokens).toBe(3);
    expect(result.nativeSessionId).toBe("ses_nested");
  });
});
