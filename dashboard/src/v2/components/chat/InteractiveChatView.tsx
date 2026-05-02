/**
 * InteractiveChatView — full-bleed 3D Project Manager experience.
 *
 * The 3D scene fills the section. A glassy composer floats at the bottom.
 * Recent messages appear as floating HUD cards on the right; a transcript
 * drawer can be toggled to read the full conversation. Threads here are
 * the same records as the Threads tab — only the visual layer changes.
 */
import { type FunctionComponent } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { ArrowUp, RefreshCw, Sparkles, MessagesSquare, X, Plus } from "lucide-preact";
import type { RefObject } from "preact";
import { ProjectManagerScene, type ProjectManagerSceneState } from "./ProjectManagerScene.js";
import { ChatMessageBubble } from "./ChatMessageBubble.js";
import { renderMarkdown } from "../../../lib/markdown.js";
import type { ChatMessageRecord, ChatThread } from "../../types.js";

export interface InteractiveChatViewProps {
  selectedThread: ChatThread | null;
  messages: ChatMessageRecord[];
  input: string;
  setInput: (v: string) => void;
  sending: boolean;
  hasWorkingReply: boolean;
  composerRef?: RefObject<HTMLTextAreaElement>;
  onSend: () => void;
  onCreateThread: () => void;
  activeConnectionLabel?: string | null;
  selectedProjectName?: string | null;
}

const SUGGESTIONS: string[] = [
  "What's the status of the active sprint?",
  "Summarize the last failed CI run.",
  "Plan the next feature for the worker pool.",
];

export const InteractiveChatView: FunctionComponent<InteractiveChatViewProps> = ({
  selectedThread,
  messages,
  input,
  setInput,
  sending,
  hasWorkingReply,
  composerRef,
  onSend,
  onCreateThread,
  activeConnectionLabel,
  selectedProjectName,
}) => {
  const [composerFocused, setComposerFocused] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [talkingPulse, setTalkingPulse] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const lastIncomingIdRef = useRef<string | null>(null);

  /* Greeting on mount — show greeting state for 2.6s on first render */
  useEffect(() => {
    const id = window.setTimeout(() => setGreeted(true), 2600);
    return () => window.clearTimeout(id);
  }, []);

  /* Detect new incoming message → trigger "talking" pulse for 2.5s */
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1]!;
    const isIncoming = last.direction !== "dashboard_to_connection";
    if (isIncoming && last.id !== lastIncomingIdRef.current) {
      lastIncomingIdRef.current = last.id;
      setTalkingPulse(true);
      const id = window.setTimeout(() => setTalkingPulse(false), 2500);
      return () => window.clearTimeout(id);
    }
  }, [messages]);

  /* Auto-scroll transcript drawer */
  useEffect(() => {
    if (!transcriptOpen || !transcriptScrollRef.current) return;
    transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
  }, [messages, transcriptOpen]);

  /* Compute scene state */
  const sceneState: ProjectManagerSceneState = useMemo(() => {
    if (!greeted) return "greeting";
    if (sending || hasWorkingReply) return "thinking";
    if (talkingPulse) return "talking";
    if (composerFocused || input.trim().length > 0) return "listening";
    return "idle";
  }, [greeted, sending, hasWorkingReply, talkingPulse, composerFocused, input]);

  const sceneEnergy = sceneState === "idle" ? 0.85 : 1.1;

  /* Recent messages for floating HUD (last 3, newest at bottom) */
  const recent = messages.slice(-3);

  const headline = useMemo(() => {
    if (selectedThread) return selectedThread.title || "Project Manager";
    if (selectedProjectName) return `${selectedProjectName} · Project Manager`;
    return "Project Manager";
  }, [selectedThread, selectedProjectName]);

  const submitDisabled = !input.trim() || sending;

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      {/* 3D scene fills the section */}
      <div className="absolute inset-0">
        <ProjectManagerScene state={sceneState} energy={sceneEnergy} />
      </div>

      {/* Subtle radial vignette to keep UI legible against the scene */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(6,10,13,0.45) 100%)",
        }}
      />

      {/* Top bar — title + actions */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-start justify-between gap-3 p-5">
        <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-signal-500">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
            <span>{sceneState === "thinking" ? "Thinking" : sceneState === "talking" ? "Speaking" : sceneState === "listening" ? "Listening" : "Standing by"}</span>
          </div>
          <div className="mt-1 max-w-[420px] truncate font-display text-base font-semibold text-white">
            {headline}
          </div>
          {activeConnectionLabel && (
            <div className="mt-0.5 truncate text-[11px] font-mono text-slate-400">
              {activeConnectionLabel}
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {!selectedThread && (
            <button
              type="button"
              onClick={onCreateThread}
              className="inline-flex items-center gap-2 rounded-full border border-signal-500/30 bg-signal-500/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-signal-500 backdrop-blur-xl transition-colors hover:bg-signal-500/20"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              New Thread
            </button>
          )}
          <button
            type="button"
            onClick={() => setTranscriptOpen((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] backdrop-blur-xl transition-colors ${
              transcriptOpen
                ? "border-white/30 bg-white/10 text-white"
                : "border-white/10 bg-black/30 text-slate-300 hover:bg-black/40 hover:text-white"
            }`}
          >
            <MessagesSquare className="h-3.5 w-3.5" strokeWidth={2.4} />
            Transcript
            {messages.length > 0 && (
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-slate-200">
                {messages.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Floating recent message HUD (right side) — only when transcript closed */}
      {!transcriptOpen && recent.length > 0 && (
        <div className="pointer-events-none absolute right-5 top-28 z-10 flex w-[min(380px,38vw)] flex-col items-end gap-2.5">
          {recent.map((m, idx) => {
            const fromDashboard = m.direction === "dashboard_to_connection";
            const fadeOpacity = idx === recent.length - 1 ? 1 : idx === recent.length - 2 ? 0.78 : 0.5;
            return (
              <div
                key={m.id}
                className={`pointer-events-auto max-w-full rounded-2xl border px-4 py-3 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all ${
                  fromDashboard
                    ? "border-signal-500/30 bg-signal-500/10 text-slate-100"
                    : "border-white/10 bg-black/40 text-slate-100"
                }`}
                style={{ opacity: fadeOpacity }}
              >
                <div className={`mb-1 text-[9px] font-mono uppercase tracking-[0.16em] ${fromDashboard ? "text-signal-500" : "text-slate-400"}`}>
                  {fromDashboard ? "You" : (m.metadata?.agentName as string) || "Project Manager"}
                </div>
                <div
                  className="prose prose-sm prose-invert max-w-none text-[13px] leading-6 break-words"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(m.bodyMarkdown) }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Working pulse hint above composer */}
      {hasWorkingReply && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 z-20 -translate-x-1/2 rounded-full border border-signal-500/30 bg-signal-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-signal-500 backdrop-blur-xl">
          <span className="inline-flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-500" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-500 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-500 [animation-delay:240ms]" />
            </span>
            Preparing reply
          </span>
        </div>
      )}

      {/* Empty-state suggestions when no messages yet */}
      {messages.length === 0 && !transcriptOpen && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 z-10 w-[min(640px,90vw)] -translate-x-1/2">
          <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setInput(s);
                  composerRef?.current?.focus();
                }}
                className="rounded-full border border-white/10 bg-black/30 px-3.5 py-1.5 text-[12px] text-slate-200 backdrop-blur-xl transition-colors hover:border-signal-500/30 hover:bg-signal-500/10 hover:text-signal-500"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating composer */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 flex justify-center px-5 pb-6">
        <div className="pointer-events-auto w-full max-w-[760px]">
          <div
            className={`relative rounded-[1.75rem] border bg-black/45 p-2.5 backdrop-blur-2xl shadow-[0_12px_60px_rgba(0,0,0,0.45)] transition-all ${
              composerFocused
                ? "border-signal-500/50 shadow-[0_0_0_3px_rgba(0,224,160,0.12),0_18px_70px_rgba(0,0,0,0.55)]"
                : "border-white/10"
            }`}
          >
            {/* Glow underline */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 -bottom-3 h-6 rounded-full opacity-60 blur-2xl"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(0,224,160,0.4), transparent)",
              }}
            />
            <textarea
              ref={composerRef}
              value={input}
              rows={1}
              placeholder={
                selectedThread
                  ? "Talk to the Project Manager…"
                  : "Start a conversation with the Project Manager…"
              }
              onFocus={() => setComposerFocused(true)}
              onBlur={() => setComposerFocused(false)}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
                setInput(el.value);
              }}
              onKeyDown={(e) => {
                if (e.isComposing) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!submitDisabled) onSend();
                }
              }}
              className="block max-h-[200px] min-h-[44px] w-full resize-none bg-transparent px-4 py-2.5 text-[15px] leading-relaxed text-white outline-none placeholder:text-slate-400"
            />
            <div className="flex items-center justify-between gap-3 px-2 pb-1.5 pt-1">
              <div className="text-[10px] font-mono text-slate-400">
                {sending
                  ? "Sending…"
                  : input.trim()
                    ? "Enter to send · Shift+Enter for newline"
                    : selectedThread
                      ? "Speak to the Project Manager"
                      : "Press Enter to start a new thread"}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!submitDisabled) onSend();
                }}
                disabled={submitDisabled}
                className="group inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-500 text-void-900 shadow-[0_0_24px_rgba(0,224,160,0.35)] transition-all hover:bg-signal-400 hover:shadow-[0_0_32px_rgba(0,224,160,0.55)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500 disabled:shadow-none"
                aria-label="Send message"
              >
                {sending ? <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={2.4} /> : <ArrowUp className="h-4 w-4" strokeWidth={2.6} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript drawer */}
      <div
        className={`absolute right-0 top-0 bottom-0 z-40 w-[min(540px,92vw)] transform border-l border-white/10 bg-black/65 backdrop-blur-2xl transition-transform duration-300 ${
          transcriptOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Transcript</div>
              <div className="mt-0.5 truncate font-display text-lg font-semibold text-white">{headline}</div>
            </div>
            <button
              type="button"
              onClick={() => setTranscriptOpen(false)}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close transcript"
            >
              <X className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </div>
          <div ref={transcriptScrollRef} className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-5">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center">
                <div className="max-w-[300px] text-sm text-slate-400">
                  No messages yet. Send the first one to start the conversation.
                </div>
              </div>
            ) : (
              messages.map((m) => <ChatMessageBubble key={m.id} message={m} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
