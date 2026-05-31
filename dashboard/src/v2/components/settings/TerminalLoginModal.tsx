import type { FunctionComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { AlertCircle, Check, RefreshCw, Terminal, X } from "lucide-preact";

interface TerminalLoginModalProps {
  providerConfigId: string;
  providerId: string;
  providerName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TerminalLoginModal: FunctionComponent<TerminalLoginModalProps> = ({
  providerConfigId,
  providerId,
  providerName,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<"connecting" | "active" | "exited" | "error">("connecting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [terminalOutput, setTerminalOutput] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");
  const [exitCode, setExitCode] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Start the Docker login container session
    const startSession = async () => {
      try {
        const response = await fetch("/api/terminal/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerConfigId }),
        });

        if (!response.ok) {
          const errData = await response.json() as { error?: string };
          throw new Error(errData.error || "Failed to start terminal session.");
        }

        const data = await response.json() as { sessionId: string; providerId: string };
        sessionIdRef.current = data.sessionId;

        // 2. Open WebSocket connection to route stdin/stdout
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/terminal/ws?sessionId=${data.sessionId}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setStatus("active");
          // Focus input automatically
          setTimeout(() => inputRef.current?.focus(), 200);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string) as { type: string; data?: string; code?: number };
            if (msg.type === "output" && typeof msg.data === "string") {
              setTerminalOutput((prev) => prev + msg.data);
            } else if (msg.type === "exit" && typeof msg.code === "number") {
              setStatus("exited");
              setExitCode(msg.code);
              if (msg.code === 0 && onSuccess) {
                onSuccess();
              }
            }
          } catch {
            // Raw string message fallback if not JSON
            if (typeof event.data === "string") {
              setTerminalOutput((prev) => prev + event.data);
            }
          }
        };

        ws.onerror = () => {
          setStatus("error");
          setErrorMessage("WebSocket connection encountered an error.");
        };

        ws.onclose = () => {
          setStatus((currentStatus) => {
            if (currentStatus === "active") {
              return "exited";
            }
            return currentStatus;
          });
        };
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : String(err));
      }
    };

    void startSession();

    return () => {
      // Cleanup: stop session and close websocket
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (sessionIdRef.current) {
        void fetch("/api/terminal/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        }).catch(() => undefined);
      }
    };
  }, [providerConfigId, onSuccess]);

  // Scroll to bottom on output update
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  const handleSendInput = (e: Event) => {
    e.preventDefault();
    if (!inputText || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(JSON.stringify({ type: "input", data: inputText + "\n" }));
    setInputText("");
    // Retain focus on the input bar
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative flex h-[600px] w-[800px] max-w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-void-950 shadow-[0_24px_60px_rgba(0,0,0,0.8)] dark:bg-void-950">
        {/* Glow Effects */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-500/30 to-transparent" />

        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-void-900/60 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-500/10 text-signal-400">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Login to {providerName}</h3>
              <p className="text-[11px] text-slate-400 font-mono">Instance: {providerConfigId}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            {status === "connecting" && (
              <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[10px] font-semibold text-amber-300">
                <RefreshCw className="h-3 w-3 animate-spin" />
                BOOTING CONTAINER
              </div>
            )}
            {status === "active" && (
              <div className="flex items-center gap-1.5 rounded-full border border-signal-500/20 bg-signal-500/10 px-2.5 py-1 text-[10px] font-semibold text-signal-300">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-400" />
                ACTIVE SESSION
              </div>
            )}
            {status === "exited" && (
              <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border ${
                exitCode === 0 
                  ? "border-status-green/20 bg-status-green/10 text-status-green" 
                  : "border-status-red/20 bg-status-red/10 text-status-red"
              }`}>
                {exitCode === 0 ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {exitCode === 0 ? "SUCCESSFUL" : `EXITED (${exitCode})`}
              </div>
            )}
            {status === "error" && (
              <div className="flex items-center gap-1.5 rounded-full border border-status-red/20 bg-status-red/10 px-2.5 py-1 text-[10px] font-semibold text-status-red">
                <AlertCircle className="h-3 w-3" />
                CONNECTION ERROR
              </div>
            )}

            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Content - The Terminal Screen */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-void-950 p-6 font-mono text-sm leading-relaxed text-slate-300">
          {status === "connecting" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-void-950/80">
              <RefreshCw className="h-8 w-8 animate-spin text-signal-400" />
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Starting Docker Environment</p>
                <p className="mt-1 text-xs text-slate-500">Mounting host credential workspace...</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-void-950/80 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-red/10 text-status-red">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Failed to connect to container</p>
                <p className="mt-2 rounded-lg bg-white/5 px-4 py-2 text-xs text-slate-400 max-w-md break-words font-mono border border-white/5">{errorMessage}</p>
              </div>
              <button 
                onClick={onClose}
                className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Close Window
              </button>
            </div>
          )}

          {/* Terminal output console */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-white/5 bg-black/40 p-4 scrollbar-thin scrollbar-thumb-white/10">
            {terminalOutput ? (
              <pre className="whitespace-pre-wrap break-all text-xs text-emerald-400 font-mono">
                {terminalOutput}
              </pre>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-600 italic">
                Awaiting terminal stream...
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>

          {/* Interactive input bar */}
          {status === "active" && (
            <form onSubmit={handleSendInput} className="mt-4 flex shrink-0 items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 focus-within:border-signal-500/50">
              <span className="text-xs font-bold tracking-wider text-slate-500 select-none uppercase font-mono">
                INPUT:
              </span>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onInput={(e) => setInputText(e.currentTarget.value)}
                placeholder="Type credentials code or confirmation and press Enter..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-signal-500/10 px-3 py-1.5 text-xs font-bold text-signal-400 hover:bg-signal-500/20 transition-colors"
              >
                SEND
              </button>
            </form>
          )}

          {status === "exited" && (
            <div className="mt-4 shrink-0 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
              <p className="text-xs text-slate-400 font-semibold">
                {exitCode === 0 
                  ? "🎉 Login process finished successfully! Credentials saved directly to your ~/.code-ux/credentials folder." 
                  : `⚠️ Login process exited with code ${exitCode}. Please try again.`
                }
              </p>
              <button
                onClick={onClose}
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-signal-500 px-4 py-2 text-xs font-bold text-void-950 hover:bg-signal-400 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
