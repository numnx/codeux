import type { ParsedConversationTurn } from "./provider-conversation-types.js";
import { parseJsonObject, toNumber } from "./usage-parse-utils.js";

export interface OpenCodeLogResult {
  transcriptText: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  /** Provider-reported run cost in USD, when available. */
  cost: number;
  nativeSessionId: string | null;
  /** Aggregated usage object stored for raw telemetry. */
  rawUsageJson: Record<string, unknown> | null;
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

interface OpenCodeTokens {
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
  cacheWrite: number;
}

/**
 * Reads OpenCode's token shape: `{ input, output, reasoning, cache: { read,
 * write } }` (carried by both `step-finish` parts and assistant messages).
 * Falls back to OpenAI-style aliases so a future schema tweak still resolves.
 */
function readOpenCodeTokens(tokens: Record<string, unknown>): OpenCodeTokens {
  const cache = asRecord(tokens.cache);
  return {
    input: toNumber(tokens.input ?? tokens.inputTokens ?? tokens.promptTokens ?? tokens.prompt_tokens ?? 0),
    output: toNumber(tokens.output ?? tokens.outputTokens ?? tokens.completionTokens ?? tokens.completion_tokens ?? 0),
    reasoning: toNumber(tokens.reasoning ?? tokens.reasoningTokens ?? tokens.reasoning_tokens ?? 0),
    cacheRead: toNumber(cache?.read ?? tokens.cache_read ?? tokens.cachedInputTokens ?? 0),
    cacheWrite: toNumber(cache?.write ?? tokens.cache_write ?? 0),
  };
}

const SESSION_ID_RE = /^ses_[A-Za-z0-9]+$/;

/**
 * Parses the `opencode run --format json` event stream (NDJSON). Extracts the
 * assistant transcript, provider-reported usage, native session id, and a
 * structured conversation including tool calls and reasoning, in stream order.
 *
 * OpenCode emits one event per line. The `run` command flattens each bus event
 * to `{ type, part?, properties? }`. Relevant part types: `text` (assistant),
 * `reasoning`, `tool` (a single part carrying both input and, once finished,
 * output/status under `part.state`), and `step-finish` (per-LLM-call usage
 * under `part.tokens`). Assistant messages (`properties.info`, role
 * `assistant`) also carry a cumulative `tokens`/`cost`, used as a fallback when
 * no `step-finish` parts are present.
 */
export function parseOpenCodeJsonLines(stdout: string): OpenCodeLogResult | null {
  const textParts: string[] = [];
  const conversation: ParsedConversationTurn[] = [];
  let nativeSessionId: string | null = null;
  let foundEvent = false;

  // Usage summed across `step-finish` parts (one per completed LLM call).
  const stepTotals: OpenCodeTokens = { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 };
  let stepCost = 0;
  let sawStepFinish = false;
  // Fallback: latest cumulative usage per assistant message id.
  const messageTotals = new Map<string, { tokens: OpenCodeTokens; cost: number }>();

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

    const properties = asRecord(parsed.properties);
    // The `run` formatter flattens parts to `parsed.part`; the raw bus/event
    // shape nests them under `properties.part`. Accept either.
    const part = asRecord(parsed.part) ?? asRecord(properties?.part);
    const info = asRecord(properties?.info) ?? asRecord(parsed.info);

    // Native session id (`ses_...`) appears on parts, messages, and event
    // envelopes. The strict `ses_` regex lets us safely consider `info.id`
    // (which is the session id on `session.created` but a `msg_` id on message
    // events — the latter is simply rejected by the pattern).
    if (!nativeSessionId) {
      for (const candidate of [part?.sessionID, info?.sessionID, properties?.sessionID, parsed.sessionID, info?.id]) {
        if (typeof candidate === "string" && SESSION_ID_RE.test(candidate)) {
          nativeSessionId = candidate;
          break;
        }
      }
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

    // Per-LLM-call usage. The step-finish marker can arrive as the part type or
    // the flattened top-level type; the underscore spelling and a legacy
    // `part.usage` object are tolerated for forward/backward compatibility.
    const isStepFinish = partType === "step-finish" || partType === "step_finish"
      || parsed.type === "step-finish" || parsed.type === "step_finish";
    if (isStepFinish && part) {
      const tokens = asRecord(part.tokens) ?? asRecord(part.usage);
      if (tokens) {
        const t = readOpenCodeTokens(tokens);
        stepTotals.input += t.input;
        stepTotals.output += t.output;
        stepTotals.reasoning += t.reasoning;
        stepTotals.cacheRead += t.cacheRead;
        stepTotals.cacheWrite += t.cacheWrite;
        stepCost += toNumber(part.cost ?? 0);
        sawStepFinish = true;
      }
      continue;
    }

    // Assistant message carries cumulative usage for the message; message
    // events stream repeatedly, so keep the latest value per message id.
    if (info && info.role === "assistant") {
      const tokens = asRecord(info.tokens);
      if (tokens && typeof info.id === "string") {
        messageTotals.set(info.id, { tokens: readOpenCodeTokens(tokens), cost: toNumber(info.cost ?? 0) });
      }
    }
  }

  if (!foundEvent) {
    return null;
  }

  // Prefer per-step usage; fall back to the sum of final per-message usage.
  let usage: OpenCodeTokens = stepTotals;
  let cost = stepCost;
  if (!sawStepFinish && messageTotals.size > 0) {
    usage = { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 };
    cost = 0;
    for (const entry of messageTotals.values()) {
      usage.input += entry.tokens.input;
      usage.output += entry.tokens.output;
      usage.reasoning += entry.tokens.reasoning;
      usage.cacheRead += entry.tokens.cacheRead;
      usage.cacheWrite += entry.tokens.cacheWrite;
      cost += entry.cost;
    }
  }

  const hasUsage = usage.input > 0 || usage.output > 0;
  const rawUsageJson = hasUsage
    ? {
      tokens: {
        input: usage.input,
        output: usage.output,
        reasoning: usage.reasoning,
        cache: { read: usage.cacheRead, write: usage.cacheWrite },
      },
      cost,
    }
    : null;

  return {
    transcriptText: textParts.join("\n\n").trim(),
    inputTokens: usage.input,
    cachedInputTokens: usage.cacheRead,
    outputTokens: usage.output,
    reasoningOutputTokens: usage.reasoning,
    cost,
    nativeSessionId,
    rawUsageJson,
    conversation,
  };
}
