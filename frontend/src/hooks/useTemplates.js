import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CATEGORY_OPTIONS, mapTemplate } from "@/utils/templateHelpers";

// Extracted from pages/Templates.jsx — no behavior changes.
export function useTemplates() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(null);
  const [preview, setPreview] = useState(null);
  const [applyTarget, setApplyTarget] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["extraction-templates", category],
    queryFn: () => api.listExtractionTemplates({ category }),
  });

  const templates = useMemo(
    () => (data?.templates || []).map(mapTemplate),
    [data],
  );

  const filtered = useMemo(
    () =>
      templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.tags.some((tag) =>
            tag.toLowerCase().includes(search.toLowerCase()),
          ),
      ),
    [templates, search],
  );

  const categoryLabel =
    CATEGORY_OPTIONS.find((c) => c.value === category)?.label || "All";

  return {
    search,
    setSearch,
    category,
    setCategory,
    preview,
    setPreview,
    applyTarget,
    setApplyTarget,
    isLoading,
    error,
    templates,
    filtered,
    categoryLabel,
  };
}
