import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Clock, FolderOpen, Plus } from "lucide-react";
import { formatTimeAgo } from "@/lib/date";
import { Skeleton } from "@/components/ui/skeleton";
import CardActionMenu from "../design-system/CardActionMenu";
import RenameModal from "../design-system/RenameModal";
import { ConfirmDialog } from "../design-system/ConfirmDialog";
import { api } from "@/lib/api";

export default function RecentClustersList({ clusters, isLoading }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleRenameSave = async (newName, newDescription) => {
    if (!renameTarget) return;
    await api.updateCluster(renameTarget.id, {
      name: newName,
      description: newDescription,
    });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    queryClient.invalidateQueries({ queryKey: ["clusters"] });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteCluster(deleteTarget.id);
      queryClient.setQueryData(["clusters"], (old) => {
        if (!old?.clusters) return old;
        return {
          ...old,
          clusters: old.clusters.filter((c) => c.id !== deleteTarget.id),
        };
      });
      queryClient.setQueryData(["dashboard-summary"], (old) => {
        if (!old) return old;
        return {
          ...old,
          recentClusters: (old.recentClusters || []).filter(
            (c) => c.id !== deleteTarget.id,
          ),
          clusters: (old.clusters || []).filter(
            (c) => c.id !== deleteTarget.id,
          ),
        };
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["clusters"] }),
      ]);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete cluster:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          Recent Clusters
        </h2>
        <Link
          to="/clusters"
          className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="surface-card rounded-2xl p-4 sm:p-5 border border-border space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-7 w-16 rounded-lg" />
              </div>
            </div>
          ))
        ) : clusters.length === 0 ? (
          <div className="surface-card rounded-md border border-border p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
              <FolderOpen className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              It seems you don't have any cluster yet
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first cluster to start organizing mock tests and
              questions.
            </p>
            <Link
              to="/clusters"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#ea580c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#c2410c]"
            >
              <Plus className="h-4 w-4" /> Create Cluster
            </Link>
          </div>
        ) : (
          clusters.map((cluster) => (
            <div
              key={cluster.id}
              onClick={() => navigate(`/cluster/${cluster.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/cluster/${cluster.id}`);
                }
              }}
              role="button"
              tabIndex={0}
              className="surface-card rounded-2xl p-4 sm:p-5 border border-border space-y-4 hover:border-orange-500/40 cursor-pointer transition-all group"
            >
              {/* Cluster Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-md text-orange-500 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-sm sm:text-base group-hover:text-orange-500 transition-colors truncate">
                        {cluster.name}
                      </span>
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-purple-500/15 text-purple-400 dark:text-purple-300">
                        {cluster.mock_test_count ?? 0} mocks
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {cluster.description || "No description yet."}
                    </p>
                  </div>
                </div>

                <CardActionMenu
                  onRename={() => setRenameTarget(cluster)}
                  onDelete={() => setDeleteTarget(cluster)}
                />
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-3 py-1 font-semibold rounded-lg bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/15">
                  {cluster.ready_count || 0} ready
                </span>
                <span className="px-3 py-1 font-semibold rounded-lg bg-blue-500/10 text-blue-500 dark:bg-blue-500/15">
                  {cluster.processing_count || 0} running
                </span>
                <span className="px-3 py-1 font-semibold rounded-lg bg-amber-500/10 text-amber-500 dark:bg-amber-500/15">
                  {cluster.review_count || 0} review
                </span>
              </div>

              {/* Card Footer */}
              <div className="flex flex-col items-stretch gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimeAgo(cluster.updated_at)}</span>
                  <span>•</span>
                  <span className="min-w-0 truncate sm:max-w-37.5">
                    Latest: {cluster.latest_mock_test_name || "PYQ"}
                  </span>
                </div>

                <span className="flex w-full items-center justify-center gap-1 rounded-full border border-orange-500/30 px-3 py-1.5 text-xs font-semibold text-orange-500 transition-colors group-hover:bg-orange-500/10 sm:w-auto">
                  Open <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {renameTarget && (
        <RenameModal
          isOpen={Boolean(renameTarget)}
          title="Rename Cluster"
          initialName={renameTarget.name}
          initialDescription={renameTarget.description || ""}
          showDescription={true}
          onClose={() => setRenameTarget(null)}
          onSave={handleRenameSave}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title={`Delete "${deleteTarget.name}"?`}
          description="Are you sure you want to delete this cluster? All mock tests inside it will also be deleted."
          confirmLabel="Delete Cluster"
          destructive={true}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
