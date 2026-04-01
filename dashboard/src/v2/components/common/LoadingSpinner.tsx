import { h, type FunctionComponent } from "preact";

export interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
  color?: string;
}

export const LoadingSpinner: FunctionComponent<LoadingSpinnerProps> = ({
  className = "",
  size = "md",
  label = "Loading...",
  color = "border-signal-500 border-t-transparent",
}) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-[3px]",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center justify-center ${className}`}
    >
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} ${color}`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};
