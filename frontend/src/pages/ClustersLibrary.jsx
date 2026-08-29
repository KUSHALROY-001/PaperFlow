import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock,
  FileText,
  FolderOpen,
  Grid3X3,
  List,
  Plus,
  Search,
} from "lucide-react";
import CreateClusterModal from "../components/CreateClusterModal";
import CardActionMenu from "../components/design-system/CardActionMenu";
import RenameModal from "../components/design-system/RenameModal";
import { ConfirmDialog } from "../components/design-system/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatTimeAgo } from "@/lib/date";

// Mirrors the real cluster card's exact silhouette below (icon box top
// left, badge pill top right, title line, description line, footer row
// with a date and an "Open" pill) rather than a generic block - per the
// implementation plan's core point, a skeleton should mimic the real
// content structure it's standing in for, not just occupy its space.
function ClusterCardSkeleton() {
  return (
    <div className="surface-card rounded-2xl p-5 border border-border flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-2/3 mb-3" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  );
}

// Matches the real list-view row's grid-cols-[2fr_1fr_1fr_auto] layout
// exactly, rather than reusing ClusterCardSkeleton's card shape stacked
// vertically - a card silhouette in the list view would look mismatched
// against the compact rows it's replacing.
function ClusterRowSkeleton() {
  return (
    <div className="grid min-w-160 grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <Skeleton className="h-3.5 w-8" />
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-7 w-16 rounded-lg justify-self-end" />
    </div>
  );
}

export default function ClustersLibrary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Target cluster for Rename / Delete modals
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["clusters"],
    queryFn: api.listClusters,
  });

  const clusters = useMemo(() => data?.clusters || [], [data]);

  const totalMockTests = useMemo(
    () =>
      clusters.reduce(
        (total, cluster) => total + Number(cluster.mock_test_count || 0),
        0,
      ),
    [clusters],
  );

  const filtered = useMemo(
    () =>
      clusters.filter((cluster) => {
        const target =
          `${cluster.name} ${cluster.description || ""}`.toLowerCase();
        return !search || target.includes(search.toLowerCase());
      }),
    [clusters, search],
  );

  const handleRenameSave = async (newName, newDescription) => {
    if (!renameTarget) return;
    await api.updateCluster(renameTarget.id, {
      name: newName,
      description: newDescription,
    });
    queryClient.invalidateQueries({ queryKey: ["clusters"] });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteCluster(deleteTarget.id);
      // Optimistically remove from clusters list so it disappears instantly
      queryClient.setQueryData(["clusters"], (old) => {
        if (!old?.clusters) return old;
        return {
          ...old,
          clusters: old.clusters.filter((c) => c.id !== deleteTarget.id),
        };
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["clusters"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete cluster:", err);
    }
  };

  const { isViewer } = useAuth();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Clusters Library
          </h1>
          {isLoading ? (
            <Skeleton className="h-4 w-40 mt-1.5" />
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {clusters.length} cluster{clusters.length !== 1 ? "s" : ""} /{" "}
              {totalMockTests} mock test{totalMockTests !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => !isViewer && setShowModal(true)}
          disabled={isViewer}
          title={
            isViewer ? "Editor role is required to create clusters" : undefined
          }
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-3xl text-sm shadow-sm transition-all sm:w-auto shrink-0 ${
            isViewer
              ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50 font-semibold"
              : "bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold"
          }`}
        >
          <Plus className="w-4 h-4" /> New Cluster
        </button>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full min-w-0 sm:flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clusters..."
            className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1 self-end surface-card border border-border rounded-3xl p-1 sm:ml-auto sm:self-auto">
          <button
            onClick={() => setView("grid")}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              view === "grid"
                ? "bg-[#ea580c] text-white font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              view === "list"
                ? "bg-[#ea580c] text-white font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-500">
          {error.message}
        </div>
      )}

      {isLoading && (
        <div
          className={
            view === "grid"
              ? "grid md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "surface-card rounded-2xl overflow-x-auto border border-border"
          }
        >
          {Array.from({ length: 6 }).map((_, index) =>
            view === "grid" ? (
              <ClusterCardSkeleton key={index} />
            ) : (
              <ClusterRowSkeleton key={index} />
            ),
          )}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="surface-card rounded-2xl p-10 sm:p-12 text-center border border-border">
          <div className="w-14 h-14 rounded-2xl text-orange-500 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            It seems you don't have any cluster yet
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first cluster to start organizing mock tests and
            questions.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-3xl text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Create Cluster
          </button>
        </div>
      )}

      {view === "grid" && filtered.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cluster) => {
            const mockTestCount = Number(cluster.mock_test_count || 0);

            return (
              <div
                key={cluster.id}
                onClick={() => navigate(`/cluster/${cluster.id}`)}
                className="surface-card rounded-2xl p-5 border border-border hover:border-orange-500/40 cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-orange-500">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2.5 py-1.5 rounded-full font-semibold">
                        <FileText className="w-3 h-3" />
                        {mockTestCount} mock test
                        {mockTestCount !== 1 ? "s" : ""}
                      </span>
                      <CardActionMenu
                        onRename={() => setRenameTarget(cluster)}
                        onDelete={() => setDeleteTarget(cluster)}
                      />
                    </div>
                  </div>
                  <h3 className="font-bold text-foreground mb-1 truncate text-base group-hover:text-orange-500 transition-colors">
                    {cluster.name}
                  </h3>
                  {cluster.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {cluster.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />{" "}
                    {formatTimeAgo(cluster.created_at)}
                  </span>
                  <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-500 border border-orange-500/30 group-hover:bg-orange-500/10 rounded-3xl transition-colors">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && filtered.length > 0 && (
        <div className="surface-card rounded-2xl overflow-x-auto border border-border">
          <div className="grid min-w-160 grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-muted/40 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wide">
            <span>Cluster</span>
            <span>Mock Tests</span>
            <span>Created</span>
            <span></span>
          </div>
          {filtered.map((cluster) => {
            const mockTestCount = Number(cluster.mock_test_count || 0);

            return (
              <div
                key={cluster.id}
                onClick={() => navigate(`/cluster/${cluster.id}`)}
                className="grid min-w-160 grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors last:border-0 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 text-orange-500 rounded-lg flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate group-hover:text-orange-500 transition-colors">
                      {cluster.name}
                    </p>
                    {cluster.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {cluster.description}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground font-medium">
                  {mockTestCount}
                </span>
                <span className="text-sm text-muted-foreground font-medium">
                  {formatTimeAgo(cluster.created_at)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-500 border border-orange-500/30 group-hover:bg-orange-500/10 rounded-3xl transition-colors">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                  <CardActionMenu
                    onRename={() => setRenameTarget(cluster)}
                    onDelete={() => setDeleteTarget(cluster)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <CreateClusterModal onClose={() => setShowModal(false)} />}

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
