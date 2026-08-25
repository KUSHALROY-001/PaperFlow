import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mapTemplate } from "@/utils/templateHelpers";

// Extracted from pages/Templates.jsx — no behavior changes.
export function useTemplates() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(null);
  // Replaces the old client-side "is popular" section (removed along with
  // migrations/037_remove_template_is_popular.sql) - a real server-side
  // sort instead of a manually-curated flag, matching category's existing
  // pattern of being included in the query key so switching it triggers
  // a genuine refetch with the new ORDER BY applied in the DB, not a
  // client-side re-sort of whatever page of data happened to load first.
  const [sortBy, setSortBy] = useState("usage");
  const [preview, setPreview] = useState(null);
  const [applyTarget, setApplyTarget] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionError, setActionError] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["extraction-templates", category, sortBy],
    queryFn: () => api.listExtractionTemplates({ category, sortBy }),
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

  // Both rating handlers update `preview` from the response directly (not
  // just invalidating the list query) so the modal - which reads from
  // `preview`, not from `templates` - reflects the new rating immediately
  // rather than waiting on a refetch. The list/card views pick it up
  // naturally once the invalidated query refetches.
  const handleRateTemplate = async (templateId, rating) => {
    try {
      setActionError("");
      const { template } = await api.rateExtractionTemplate(templateId, rating);
      const mapped = mapTemplate(template);
      setPreview((current) => (current?.id === templateId ? mapped : current));
      await queryClient.invalidateQueries({
        queryKey: ["extraction-templates"],
      });
    } catch (rateError) {
      setActionError(rateError.message || "Could not submit rating");
    }
  };

  const handleRemoveRating = async (templateId) => {
    try {
      setActionError("");
      const { template } = await api.deleteExtractionTemplateRating(templateId);
      const mapped = mapTemplate(template);
      setPreview((current) => (current?.id === templateId ? mapped : current));
      await queryClient.invalidateQueries({
        queryKey: ["extraction-templates"],
      });
    } catch (removeError) {
      setActionError(removeError.message || "Could not remove rating");
    }
  };

  return {
    search,
    setSearch,
    category,
    setCategory,
    sortBy,
    setSortBy,
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
    handleRateTemplate,
    handleRemoveRating,
    isLoading,
    error,
    templates,
    filtered,
  };
}
