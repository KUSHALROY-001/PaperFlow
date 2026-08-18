import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// One hook for the whole PublicCatalog.jsx page: the catalog listing
// itself (name/description/topics per test, re-fetched whenever the topic
// filter changes) plus the filter-dropdown's own topic list (fetched once,
// independent of the current filter - it needs to show every topic across
// the whole catalog, not just whichever one happens to be selected).
export function useCatalog(slug) {
  const [topic, setTopic] = useState(null);
  const [examYear, setExamYear] = useState(null);
  const [search, setSearch] = useState("");

  const catalogQuery = useQuery({
    queryKey: ["catalog", slug, topic, examYear],
    queryFn: () => api.getCatalog(slug, { topic, examYear }),
    enabled: Boolean(slug),
    retry: false, // a 404 (no such catalog) is a real, final answer here
  });

  const topicsQuery = useQuery({
    queryKey: ["catalog-topics", slug],
    queryFn: () => api.getCatalogTopics(slug),
    enabled: Boolean(slug),
    retry: false,
  });

  const examYearsQuery = useQuery({
    queryKey: ["catalog-exam-years", slug],
    queryFn: () => api.getCatalogExamYears(slug),
    enabled: Boolean(slug),
    retry: false,
  });

  // Search is client-side only, over whatever the current topic filter
  // already narrowed down to - a full catalog is small enough (this is a
  // single workspace's published tests, not a cross-workspace index) that
  // a dedicated search endpoint would be more plumbing than the problem
  // needs.
  const mockTests = useMemo(() => {
    const all = catalogQuery.data?.mockTests || [];
    if (!search.trim()) return all;
    const needle = search.trim().toLowerCase();
    return all.filter(
      (test) =>
        test.name.toLowerCase().includes(needle) ||
        test.description?.toLowerCase().includes(needle),
    );
  }, [catalogQuery.data, search]);

  return {
    workspace: catalogQuery.data?.workspace || null,
    mockTests,
    topics: topicsQuery.data?.topics || [],
    topic,
    setTopic,
    examYears: examYearsQuery.data?.examYears || [],
    examYear,
    setExamYear,
    search,
    setSearch,
    isLoading: catalogQuery.isLoading,
    isError: catalogQuery.isError,
    error: catalogQuery.error,
  };
}
