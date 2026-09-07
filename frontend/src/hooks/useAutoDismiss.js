import { useEffect } from "react";

// Auto-clears a transient error/status message after `delayMs` (default
// 10s) instead of leaving it on screen indefinitely. Pass the state
// setter directly (e.g. setError, not an inline arrow function) - a
// fresh arrow function every render would reset the timer on every
// render instead of only when the message itself actually changes.
export function useAutoDismiss(value, setValue, delayMs = 10_000) {
  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(() => setValue(""), delayMs);
    return () => clearTimeout(timer);
  }, [value, setValue, delayMs]);
}
