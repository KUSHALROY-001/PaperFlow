import { useCallback, useEffect, useRef, useState } from "react";

export function usePanelResize({
  storageKey = "paperflow_question_editor_split",
  defaultPercent = 50,
  minPercent = 30,
  maxPercent = 75,
} = {}) {
  const containerRef = useRef(null);

  const [leftPercent, setLeftPercent] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved != null) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed) && parsed >= minPercent && parsed <= maxPercent) {
          return parsed;
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
    return defaultPercent;
  });

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_collapsed`);
      return saved === "true";
    } catch {
      return false;
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const handlePointerDown = useCallback((event) => {
    event.preventDefault();
    setIsDragging(true);
    isDraggingRef.current = true;
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`${storageKey}_collapsed`, String(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  }, [storageKey]);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (event) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const offsetX = event.clientX - rect.left;
      let newPercent = (offsetX / rect.width) * 100;

      if (newPercent < minPercent) newPercent = minPercent;
      if (newPercent > maxPercent) newPercent = maxPercent;

      // If user drags to expand when collapsed, un-collapse automatically
      setIsCollapsed(false);
      try {
        localStorage.setItem(`${storageKey}_collapsed`, "false");
      } catch {
        // Ignore
      }

      setLeftPercent(newPercent);
      try {
        localStorage.setItem(storageKey, String(Math.round(newPercent * 10) / 10));
      } catch {
        // Ignore
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, minPercent, maxPercent, storageKey]);

  return {
    containerRef,
    leftPercent,
    isDragging,
    isCollapsed,
    handlePointerDown,
    toggleCollapse,
  };
}
