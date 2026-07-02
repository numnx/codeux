import type { FunctionComponent } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import type { ProjectSettings } from "../../../../types.js";
import { ActionButton } from "../SettingsSurface.js";
import { ActionFeedbackRegion } from "../../ui/ActionFeedbackRegion.js";
import { Row } from "../SettingsFormFields.js";

export const ProviderPanel: FunctionComponent<{
  settings: ProjectSettings;
  update: (patch: Partial<ProjectSettings>) => void;
  getBadge: (path: string) => string | undefined;
}> = () => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: "idle" | "success" | "error", message: string | null }>({ status: "idle", message: null });
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const runTest = () => {
    setTesting(true);
    setTestResult({ status: "idle", message: null });

    // Cycle through mock states to demonstrate async feedback primitives
    timeoutRef.current = window.setTimeout(() => {
      // Simulate random success/failure for demonstration
      const isSuccess = Math.random() > 0.5;
      if (isSuccess) {
        setTestResult({ status: "success", message: "Connection verified successfully." });
      } else {
        setTestResult({ status: "error", message: "Failed to connect to provider API." });
      }
      setTesting(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[1.5rem] border border-black/[0.06] bg-white/72 px-5 py-4 text-sm text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-400">
        Provider routing moved to the v2 `AI Models` panel.
      </div>

      <Row label="Test Provider Connection" description="Simulate an async verification to test provider settings configuration using shared feedback components." last>
        <div className="flex flex-col gap-3">
          <div>
            <ActionButton
              label="Test Provider"
              onClick={runTest}
              tone="primary"
              busy={testing}
            />
          </div>
          {(testing || testResult.status !== "idle") && (
            <ActionFeedbackRegion
              status={testing ? "pending" : testResult.status}
              message={testing ? "Testing connection..." : testResult.message}
              retryAction={testResult.status === "error" ? runTest : undefined}
              retryLabel="Retry"
              clearError={() => setTestResult({ status: "idle", message: null })}
              autoDismissMs={5000}
            />
          )}
        </div>
      </Row>
    </div>
  );
};
