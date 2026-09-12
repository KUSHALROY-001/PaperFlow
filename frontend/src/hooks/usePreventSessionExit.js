import { useState, useEffect, useRef, useCallback } from "react";

// How long a user has to undo an exit/cancel confirmation before it's
// actually carried out, so one mistaken tap on the confirm button can't
// end an in-progress test outright.
const EXIT_GRACE_PERIOD_SECONDS = 30;

/**
 * Custom hook to intercept browser back button, mobile back gestures,
 * and page reload/tab-closing events during active test sessions.
 *
 * Displays a confirmation dialog before allowing the user to exit. Once
 * confirmed, a one-minute countdown runs (exposed via cancelSecondsLeft)
 * during which the caller can render an "Undo"-style control wired to
 * undoExit() before onConfirmExit actually runs.
 */
export function usePreventSessionExit({ isActive, onConfirmExit }) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [cancelSecondsLeft, setCancelSecondsLeft] = useState(null);
  const isNavigatingAwayRef = useRef(false);
  const onConfirmExitRef = useRef(onConfirmExit);

  // Keep the ref in sync with the latest onConfirmExit outside of render,
  // so a parent re-render with a new onConfirmExit identity doesn't reset
  // an in-progress countdown (see the countdown effect below) while still
  // never reading/writing a ref during render itself.
  useEffect(() => {
    onConfirmExitRef.current = onConfirmExit;
  }, [onConfirmExit]);

  useEffect(() => {
    if (!isActive) return;

    // Push state into history so back button triggers popstate
    window.history.pushState(
      { mockSessionActive: true },
      "",
      window.location.href,
    );

    const handlePopState = () => {
      if (isNavigatingAwayRef.current) return;
      // Re-push current state to retain the user on the page
      window.history.pushState(
        { mockSessionActive: true },
        "",
        window.location.href,
      );
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

  // Ticks the grace-period countdown down to zero, then runs the real
  // exit. A ref (not the onConfirmExit prop) backs the callback so a
  // parent re-render with a new onConfirmExit identity doesn't reset an
  // in-progress countdown.
  useEffect(() => {
    if (cancelSecondsLeft === null) return;
    if (cancelSecondsLeft <= 0) {
      onConfirmExitRef.current?.();
      return;
    }
    const timer = setTimeout(() => {
      setCancelSecondsLeft((seconds) =>
        seconds === null ? seconds : seconds - 1,
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [cancelSecondsLeft]);

  const confirmExit = useCallback(() => {
    isNavigatingAwayRef.current = true;
    setShowExitConfirm(false);
    setCancelSecondsLeft(EXIT_GRACE_PERIOD_SECONDS);
  }, []);

  const cancelExit = useCallback(() => {
    setShowExitConfirm(false);
  }, []);

  // Aborts a pending exit while its grace-period countdown is still
  // running, and re-arms the back-button/reload guard.
  const undoExit = useCallback(() => {
    isNavigatingAwayRef.current = false;
    setCancelSecondsLeft(null);
  }, []);

  return {
    showExitConfirm,
    setShowExitConfirm,
    confirmExit,
    cancelExit,
    cancelSecondsLeft,
    undoExit,
  };
}
