import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CATEGORY_OPTIONS, mapTemplate } from "@/utils/templateHelpers";

// Extracted from pages/Templates.jsx — no behavior changes.
export function useTemplates() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(null);
  const [preview, setPreview] = useState(null);
  const [applyTarget, setApplyTarget] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionError, setActionError] = useState("");

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

  // deleteTarget is cleared up front (not after the request resolves) so
  // the ConfirmDialog closes immediately on click, same as
  // MockTestWorkspace's delete flow — a failure surfaces via actionError
  // instead of leaving the dialog hanging open.
  const handleDeleteTemplate = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      setActionError("");
      await api.deleteExtractionTemplate(target.id);
      await queryClient.invalidateQueries({
        queryKey: ["extraction-templates"],
      });
    } catch (deleteError) {
      setActionError(deleteError.message || "Could not delete template");
    }
  };

  return {
    search,
    setSearch,
    category,
    setCategory,
    preview,
    setPreview,
    applyTarget,
    setApplyTarget,
    showCreateModal,
    setShowCreateModal,
    editTarget,
    setEditTarget,
    deleteTarget,
    setDeleteTarget,
    actionError,
    handleDeleteTemplate,
    isLoading,
    error,
    templates,
    filtered,
    categoryLabel,
  };
}
