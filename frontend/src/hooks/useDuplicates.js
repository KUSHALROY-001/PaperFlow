import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

// A read-only report - no mutation state (resolvingId/resolveError) needed
// anymore, just load/loading/error, same shape useMyResults.js uses for
// its own plain GET.
export function useDuplicates() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const result = await api.listDuplicateGroups();
      setGroups(result.groups || []);
    } catch (error) {
      setLoadError(error.message || "Could not load duplicate questions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    groups,
    loading,
    loadError,
    reload: load,
  };
}
