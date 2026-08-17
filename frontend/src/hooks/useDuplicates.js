import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

// Mirrors useMyResults.js's manual load/loading/error state rather than
// introducing react-query mutations as a new pattern - nothing else in
// this codebase uses useMutation, and this hook's needs (load a list,
// remove one item locally on success, surface one error at a time) don't
// need more than that.
export function useDuplicates() {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveError, setResolveError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const result = await api.listDuplicates();
      setPairs(result.pairs || []);
    } catch (error) {
      setLoadError(error.message || "Could not load duplicate questions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Removes the pair from the list locally on success rather than
  // re-fetching the whole queue after every action - keeps the "auto
  // advance to the next pair" throughput-focused flow from the plan
  // snappy instead of a fetch round trip between every decision.
  const resolve = useCallback(async (pairId, { action, keepQuestionId }) => {
    setResolvingId(pairId);
    setResolveError(null);
    try {
      await api.resolveDuplicate(pairId, { action, keepQuestionId });
      setPairs((current) => current.filter((pair) => pair.id !== pairId));
    } catch (error) {
      setResolveError(
        error.message || "Could not resolve this pair - please try again.",
      );
    } finally {
      setResolvingId(null);
    }
  }, []);

  return {
    pairs,
    loading,
    loadError,
    resolvingId,
    resolveError,
    resolve,
    reload: load,
  };
}
