import { h } from "preact";
import type { FunctionComponent } from "preact";
import { Zap, RefreshCcw, WifiOff } from "lucide-preact";
import type { TransportState } from "../../../lib/realtime/dashboard-realtime-client.js";

export interface LiveTransportBannerProps {
  transportState: TransportState;
  isRecovering: boolean;
  snapshotUpdatedAt: string | null;
  error: string | null;
}

export const LiveTransportBanner: FunctionComponent<LiveTransportBannerProps> = ({
  transportState,
  isRecovering,
  error,
}) => {
  if (transportState === "connected" && !isRecovering && !error) {
    return null;
  }

  let icon = <WifiOff className="w-5 h-5 shrink-0" />;
  let title = "Disconnected";
  let message = "Lost connection to the live stream. Retrying...";
  let wrapperClass = "bg-status-red/10 border-status-red/20 text-status-red";
  let iconClass = "text-status-red";
  let isUrgent = true;

  if (error) {
    icon = <Zap className="w-5 h-5 shrink-0" />;
    title = "Connection Error";
    message = error;
    wrapperClass = "bg-status-red/10 border-status-red/20 text-status-red";
    iconClass = "text-status-red";
    isUrgent = true;
  } else if (transportState === "reconnecting") {
    icon = <RefreshCcw className="w-5 h-5 shrink-0 animate-spin" />;
    title = "Reconnecting";
    message = "Attempting to restore connection...";
    wrapperClass = "bg-status-amber/10 border-status-amber/20 text-status-amber";
    iconClass = "text-status-amber";
    isUrgent = false;
  } else if (isRecovering || transportState === "connecting") {
    icon = <RefreshCcw className="w-5 h-5 shrink-0 animate-spin" />;
    title = "Recovering State";
    message = "Fetching latest snapshot to ensure data consistency...";
    wrapperClass = "bg-status-amber/10 border-status-amber/20 text-status-amber";
    iconClass = "text-status-amber";
    isUrgent = false;
  }

  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 rounded-2xl border backdrop-blur-md mb-6 ${wrapperClass}`}
      role={isUrgent ? "alert" : "status"}
      aria-live={isUrgent ? "assertive" : "polite"}
    >
      <div className={`flex items-center justify-center ${iconClass}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold tracking-tight">{title}</span>
        <span className="text-sm opacity-90">{message}</span>
      </div>
    </div>
  );
};
