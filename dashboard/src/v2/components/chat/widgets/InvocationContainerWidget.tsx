import { type FunctionComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { ChatWidgetFrame, type ExecutionStatus } from "./ChatWidgetFrame.js";
import { ContainerShip } from "../../ui/PlanningShip.js";
import { Terminal, CheckCircle2, AlertCircle } from "lucide-preact";

export interface InvocationContainerWidgetProps {
  containerPhase: 'starting' | 'working' | 'completed' | 'failed';
  providerName?: string | null;
  agentName?: string | null;
}

export const InvocationContainerWidget: FunctionComponent<InvocationContainerWidgetProps> = ({
  containerPhase,
  providerName,
  agentName
}) => {
  const previousPhase = useRef(containerPhase);
  const [mountedPhase, setMountedPhase] = useState(containerPhase);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (containerPhase !== mountedPhase) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        previousPhase.current = containerPhase;
        setMountedPhase(containerPhase);
        setIsTransitioning(false);
      }, 300); // Wait for fade out
      return () => clearTimeout(timer);
    }
  }, [containerPhase, mountedPhase]);

  let status: ExecutionStatus = "running";
  if (containerPhase === "completed") {
    status = "completed";
  } else if (containerPhase === "failed") {
    status = "failed";
  }

  const renderStarting = () => (
    <div class="flex flex-col items-center justify-center h-full w-full">
      <div class="relative w-full max-w-[200px] h-20 mb-4 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <div class="ocean-wave w-full h-full flex items-center justify-center">
          <svg viewBox="-60 -40 120 80" class="w-full h-full transform translate-y-2 ship-bob" aria-hidden="true">
            {/* @ts-ignore */}
            <ContainerShip accentColor="#00E0A0" isMoving={true} isDark={true} />
          </svg>
        </div>
      </div>
      <div class="text-slate-400 text-sm motion-safe:animate-pulse">Starting container...</div>
    </div>
  );

  const renderWorking = () => (
    <div class="flex flex-col items-start justify-center h-full w-full gap-2">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-full bg-slate-800/50 ring-2 ring-emerald-500/40 motion-safe:animate-pulse">
          <Terminal size={20} class="text-emerald-400" />
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="text-emerald-400 font-semibold text-sm">CLI Working</span>
            <span class="flex items-center gap-1">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-bounce [animation-delay:0ms]" />
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-bounce [animation-delay:120ms]" />
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-bounce [animation-delay:240ms]" />
            </span>
          </div>
          {providerName && (
            <span class="text-xs text-slate-500">via {providerName}</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderCompleted = () => (
    <div class="flex flex-col items-center justify-center h-full w-full gap-2">
      <div class="flex items-center gap-2">
        <CheckCircle2
          size={24}
          class="text-emerald-400 transform transition-transform duration-200"
          style={{
            animation: 'scale-in 200ms cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards',
          }}
        />
        <span class="text-emerald-300 font-medium">Invocation completed</span>
      </div>
      {agentName && (
        <span class="text-xs text-slate-400">Answered by {agentName}</span>
      )}
    </div>
  );

  const renderFailed = () => (
    <div class="flex flex-col items-center justify-center h-full w-full gap-2">
      <div class="flex items-center gap-2">
        <AlertCircle size={24} class="text-red-400" />
        <span class="text-red-400 font-medium">Invocation failed</span>
      </div>
    </div>
  );

  const renderPhase = (phase: string) => {
    switch (phase) {
      case 'starting': return renderStarting();
      case 'working': return renderWorking();
      case 'completed': return renderCompleted();
      case 'failed': return renderFailed();
      default: return null;
    }
  };

  return (
    <ChatWidgetFrame status={status}>
      <div class="min-h-[6rem] relative p-4 flex items-center justify-center overflow-hidden">
        <div class="grid w-full h-full relative" style={{ gridTemplateColumns: '1fr', gridTemplateRows: '1fr' }}>
          {isTransitioning && previousPhase.current !== mountedPhase && (
             <div
               class="col-start-1 row-start-1 w-full h-full flex items-center justify-center transition-opacity duration-300 opacity-0 pointer-events-none"
             >
               {renderPhase(previousPhase.current)}
             </div>
          )}
          <div
            class={`col-start-1 row-start-1 w-full h-full flex items-center justify-center transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
          >
            {renderPhase(mountedPhase)}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media (prefers-reduced-motion: no-preference) {
          @keyframes scale-in {
            0% { transform: scale(0.9); }
            100% { transform: scale(1); }
          }
        }
      `}} />
    </ChatWidgetFrame>
  );
};
