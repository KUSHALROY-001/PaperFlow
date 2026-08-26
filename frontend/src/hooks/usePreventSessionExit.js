import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook to intercept browser back button, mobile back gestures,
 * and page reload/tab-closing events during active test sessions.
 *
 * Displays a confirmation dialog before allowing the user to exit.
 */
export function usePreventSessionExit({ isActive, onConfirmExit }) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isNavigatingAwayRef = useRef(false);

  useEffect(() => {
    if (!isActive) return;

    // Push state into history so back button triggers popstate
    window.history.pushState({ mockSessionActive: true }, "", window.location.href);

    const handlePopState = () => {
      if (isNavigatingAwayRef.current) return;
      // Re-push current state to retain the user on the page
      window.history.pushState({ mockSessionActive: true }, "", window.location.href);
      setShowExitConfirm(true);
    };

    const handleBeforeUnload = (event) => {
      if (isNavigatingAwayRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isActive]);

  const confirmExit = useCallback(async () => {
    isNavigatingAwayRef.current = true;
    setShowExitConfirm(false);
    if (onConfirmExit) {
      await onConfirmExit();
    }
  }, [onConfirmExit]);

  const cancelExit = useCallback(() => {
    setShowExitConfirm(false);
  }, []);

  return {
    showExitConfirm,
    setShowExitConfirm,
    confirmExit,
    cancelExit,
  };
}
