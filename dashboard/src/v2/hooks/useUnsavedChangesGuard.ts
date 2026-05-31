import { useEffect, useRef } from "preact/hooks";
import { registerNavigationBlocker } from "../router/navigation-blocker.js";

interface UseUnsavedChangesGuardOptions {
  message?: string;
}

const DEFAULT_UNSAVED_CHANGES_MESSAGE = "You have unsaved changes. Leave this page?";

export const useUnsavedChangesGuard = (
  hasUnsavedChanges: boolean,
  options: UseUnsavedChangesGuardOptions = {},
): void => {
  const { message = DEFAULT_UNSAVED_CHANGES_MESSAGE } = options;
  const dirtyRef = useRef(hasUnsavedChanges);

  useEffect(() => {
    dirtyRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const unregisterNavigationBlocker = registerNavigationBlocker({
      shouldBlock: () => dirtyRef.current,
      confirmNavigation: () => window.confirm(message),
    });

    return () => {
      unregisterNavigationBlocker();
    };
  }, [message]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasUnsavedChanges) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [hasUnsavedChanges]);
};
