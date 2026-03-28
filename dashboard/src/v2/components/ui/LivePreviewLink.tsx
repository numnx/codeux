import type { FunctionComponent } from "preact";
import { ExternalLink } from "lucide-preact";
import type { SprintPreviewSession } from "../../../types.js";
import { buildPreviewUrl } from "../../lib/preview-origin.js";

interface LivePreviewLinkProps {
  session: SprintPreviewSession | null;
}

export const LivePreviewLink: FunctionComponent<LivePreviewLinkProps> = ({ session }) => {
  if (!session || session.status !== "running" || !session.hostPort) {
    return null;
  }

  const previewUrl = buildPreviewUrl(session.id, session.lastKnownPath);

  return (
    <a
      href={previewUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded-full border flex items-center gap-2.5 backdrop-blur-md bg-signal-500/8 dark:bg-signal-500/10 text-signal-600 dark:text-signal-400 border-signal-500/15 dark:border-signal-500/20 shadow-[0_0_20px_rgba(0,224,160,0.08)] transition-all hover:bg-signal-500/15"
      title="Open live preview"
    >
      <span className="w-2 h-2 rounded-full relative bg-signal-500">
        <span className="absolute inset-0 rounded-full animate-ping bg-signal-400 opacity-60" />
      </span>
      Live Preview
      <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
    </a>
  );
};
