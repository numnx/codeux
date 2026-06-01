import type { ParsedConversationTurn } from "./provider-conversation-types.js";
import { parseJsonObject, toNumber } from "./usage-parse-utils.js";

export interface OpenCodeLogResult {
  transcriptText: string;
  inputTokens: number;
  outputTokens: number;
  nativeSessionId: string | null;
  conversation: ParsedConversationTurn[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Parses the `opencode run --format json` event stream (NDJSON). Extracts the
 * assistant transcript, provider-reported usage, native session id, and a
 * structured conversation including tool calls and reasoning, in stream order.
 *
 * OpenCode emits one event per line, each `{ type, part?, properties? }`.
 * Relevant part types: `text` (assistant), `reasoning`, and `tool` (a single
 * part that carries both the call input and, once finished, the output and
 * status under `part.state`). Usage is reported on `step_finish` events.
 */
export function parseOpenCodeJsonLines(stdout: string): OpenCodeLogResult | null {
  const textParts: string[] = [];
  const conversation: ParsedConversationTurn[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let nativeSessionId: string | null = null;
  let foundEvent = false;

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) {
      continue;
    }
    const parsed = parseJsonObject(trimmed);
    if (!parsed || typeof parsed.type !== "string") {
      continue;
    }
    foundEvent = true;

    const part = asRecord(parsed.part);
    const properties = asRecord(parsed.properties);
    const info = asRecord(properties?.info);

    if (!nativeSessionId && typeof properties?.sessionID === "string") {
      nativeSessionId = properties.sessionID;
    }
    if (!nativeSessionId && typeof info?.id === "string") {
      nativeSessionId = info.id;
    }

    const partType = typeof part?.type === "string" ? part.type : null;

    if (parsed.type === "text" && partType === "text" && typeof part?.text === "string" && part.text.trim()) {
      const text = part.text.trim();
      textParts.push(text);
      conversation.push({ kind: "assistant", text });
      continue;
    }

    if (partType === "reasoning" && typeof part?.text === "string" && part.text.trim()) {
      conversation.push({ kind: "reasoning", text: part.text.trim() });
      continue;
    }

    if (partType === "tool" && part) {
      const state = asRecord(part.state);
      const status = typeof state?.status === "string" ? state.status : undefined;
      const toolName = typeof part.tool === "string" ? part.tool : undefined;
      const toolCallId = typeof part.callID === "string"
        ? part.callID
        : typeof part.id === "string"
          ? part.id
          : undefined;
      const args = state?.input !== undefined ? stringify(state.input) : undefined;
      const output = state?.output !== undefined ? stringify(state.output) : undefined;
      // OpenCode emits the same tool part multiple times as it transitions
      // (pending -> running -> completed). Collapse to one entry per callID,
      // upgrading it as later states carry the input/output.
      const existing = toolCallId
        ? conversation.find(t => t.kind === "tool_call" && t.toolCallId === toolCallId)
        : undefined;
      if (existing) {
        if (toolName) existing.toolName = toolName;
        if (args !== undefined) existing.toolArguments = args;
        if (output !== undefined) existing.toolOutput = output;
        if (status) existing.toolStatus = status;
      } else {
        conversation.push({
          kind: "tool_call",
          text: "",
          toolName,
          toolCallId,
          toolArguments: args,
          toolOutput: output,
          toolStatus: status,
        });
      }
      continue;
    }

    if (parsed.type === "step_finish" && part) {
      const usage = asRecord(part.usage);
      if (usage) {
        inputTokens += toNumber(usage.promptTokens ?? usage.inputTokens ?? usage.input_tokens ?? 0);
        outputTokens += toNumber(usage.completionTokens ?? usage.outputTokens ?? usage.output_tokens ?? 0);
      }
    }
  }

  if (!foundEvent) {
    return null;
  }

  return {
    transcriptText: textParts.join("\n\n").trim(),
    inputTokens,
    outputTokens,
    nativeSessionId,
    conversation,
  };
}
