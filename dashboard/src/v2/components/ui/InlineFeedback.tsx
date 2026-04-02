import type { FunctionComponent } from "preact";
import { AlertCircle, CheckCircle, Info } from "lucide-preact";

interface InlineFeedbackProps {
    type?: "error" | "success" | "info";
    message: string;
    className?: string;
}

export const InlineFeedback: FunctionComponent<InlineFeedbackProps> = ({ type = "error", message, className = "" }) => {
    const isError = type === "error";
    const isSuccess = type === "success";
    const isInfo = type === "info";

    return (
        <div className={`px-3 py-2 mx-3 mb-2 rounded-lg border text-xs font-medium flex items-start gap-2 break-words ${
            isError ? "bg-status-red/10 border-status-red/20 text-status-red" :
            isSuccess ? "bg-status-green/10 border-status-green/20 text-status-green" :
            "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400"
        } ${className}`}>
            <span className="shrink-0 mt-0.5">
                {isError && <AlertCircle aria-hidden="true" className="w-3.5 h-3.5" />}
                {isSuccess && <CheckCircle aria-hidden="true" className="w-3.5 h-3.5" />}
                {isInfo && <Info aria-hidden="true" className="w-3.5 h-3.5" />}
            </span>
            <p className="flex-1">{message}</p>
        </div>
    );
};
