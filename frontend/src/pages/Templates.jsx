import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Star } from "lucide-react";
import { useTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/lib/AuthContext";
import { CATEGORY_OPTIONS } from "@/utils/templateHelpers";
import PopularTemplateCard from "../components/templates/PopularTemplateCard";
import TemplateCard from "../components/templates/TemplateCard";
import TemplatePreviewModal from "../components/templates/TemplatePreviewModal";
import ApplyTemplateModal from "../components/templates/ApplyTemplateModal";
import CreateTemplateModal from "../components/templates/CreateTemplateModal";
import { ConfirmDialog } from "../components/design-system/ConfirmDialog";
import { SkeletonCard } from "@/components/ui/skeleton-card";

export default function Templates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isViewer } = useAuth();

  const {
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
    handleRateTemplate,
    handleRemoveRating,
    isLoading,
    error,
    templates,
    filtered,
    categoryLabel,
  } = useTemplates();

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Extraction Templates
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Pre-built formats for popular exams — apply to any cluster
            instantly.
          </p>
          {error && (
            <p className="text-xs text-red-500 mt-1">{error.message}</p>
          )}
          {actionError && (
            <p className="text-xs text-red-500 mt-1">{actionError}</p>
          )}
        </div>
        <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
          <button
            disabled={isViewer}
            onClick={() => !isViewer && setShowCreateModal(true)}
            title={
              isViewer
                ? "Editor role is required to create templates"
                : undefined
            }
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all order-2 sm:order-1 ${
              isViewer
                ? "border border-border bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50"
                : "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20"
            }`}
          >
            <Plus className="w-4 h-4" /> Create Template
          </button>
          <div className="order-1 sm:order-2">
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              {templates.length}
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Templates available
            </div>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORY_OPTIONS.map((c) => {
            const active = category === c.value;
            return (
              <button
                key={c.label}
                onClick={() => setCategory(c.value)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  active
                    ? "bg-orange-500/10 text-orange-500 dark:bg-orange-500/15 dark:text-orange-500 font-bold border border-orange-500/20"
                    : "bg-card border border-border text-muted-foreground hover:border-orange-500/40 hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Popular section */}
      {categoryLabel === "All" &&
        !search &&
        templates.some((t) => t.popular) && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-bold text-foreground">
                Most Popular
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {templates
                .filter((t) => t.popular)
                .map((t) => (
                  <PopularTemplateCard
                    key={t.id}
                    template={t}
                    onPreview={setPreview}
                  />
                ))}
            </div>
          </div>
        )}

      {/* All templates grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} showIcon={true} lines={3} />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onPreview={setPreview}
              onApply={setApplyTarget}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {preview && (
        <TemplatePreviewModal
          template={preview}
          onClose={() => setPreview(null)}
          onApply={() => {
            setApplyTarget(preview);
            setPreview(null);
          }}
          onRate={(rating) => handleRateTemplate(preview.id, rating)}
          onRemoveRating={() => handleRemoveRating(preview.id)}
        />
      )}

      {/* Apply modal - picks the destination cluster, then creates a real
          mock test pre-filled from the template via POST /apply */}
      {applyTarget && (
        <ApplyTemplateModal
          template={applyTarget}
          onClose={() => setApplyTarget(null)}
          onApplied={(clusterId, mockTestId) => {
            queryClient.invalidateQueries({ queryKey: ["clusters"] });
            queryClient.invalidateQueries({
              queryKey: ["mock-tests", clusterId],
            });
            queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
            queryClient.invalidateQueries({
              queryKey: ["extraction-templates"],
            });
            setApplyTarget(null);
            navigate(`/cluster/${clusterId}/mocktest/${mockTestId}`);
          }}
        />
      )}

      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            queryClient.invalidateQueries({
              queryKey: ["extraction-templates"],
            });
            setShowCreateModal(false);
          }}
        />
      )}

      {editTarget && (
        <CreateTemplateModal
          initialTemplate={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            queryClient.invalidateQueries({
              queryKey: ["extraction-templates"],
            });
            setEditTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title={`Delete "${deleteTarget.name}"?`}
          description="Mock tests already created from this template keep their questions and settings — this only removes the template itself from your workspace. This action cannot be undone."
          confirmLabel="Delete Template"
          destructive={true}
          onConfirm={handleDeleteTemplate}
        />
      )}
    </div>
  );
}
