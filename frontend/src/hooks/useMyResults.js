import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export function scorePercent(attempt) {
  if (!attempt || !attempt.totalQuestions) return 0;
  return Math.round((attempt.correctCount / attempt.totalQuestions) * 100);
}

export function formatDateTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  return (
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " · " +
    date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

export function useMyResults() {
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setLoadError(null);
        const result = await api.listMyAttempts();
        if (!cancelled) setAttempts(result.attempts || []);
      } catch (error) {
        if (!cancelled)
          setLoadError(error.message || "Could not load your results.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const submittedAttempts = attempts.filter((a) => a.status === "submitted");
  const totalAttempts = attempts.length;
  const avgScore = submittedAttempts.length
    ? Math.round(
        submittedAttempts.reduce((sum, a) => sum + scorePercent(a), 0) /
          submittedAttempts.length,
      )
    : 0;
  const best = submittedAttempts.length
    ? Math.max(...submittedAttempts.map(scorePercent))
    : 0;

  const filtered = attempts.filter((a) => {
    if (filter === "all") return true;
    if (a.status !== "submitted") return false;
    const pct = scorePercent(a);
    if (filter === "passed") return pct >= 60;
    if (filter === "failed") return pct < 60;
    return true;
  });

  const removeAttempt = useCallback((attemptId) => {
    setAttempts((current) =>
      current.filter((attempt) => attempt.id !== attemptId),
    );
  }, []);

  return {
    filter,
    setFilter,
    loading,
    loadError,
    attempts,
    submittedAttempts,
    totalAttempts,
    avgScore,
    best,
    filtered,
    removeAttempt,
  };
}
