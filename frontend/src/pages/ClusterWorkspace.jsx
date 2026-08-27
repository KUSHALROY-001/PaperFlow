import { useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle,
  Edit2,
  FileText,
  FolderOpen,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { useClusterWorkspace } from "@/hooks/useClusterWorkspace";
import { useAuth } from "@/lib/AuthContext";
import MockTestCard from "../components/cluster/MockTestCard";
import CreateMockTestModal from "../components/cluster/CreateMockTestModal";
import { ConfirmDialog } from "../components/design-system/ConfirmDialog";

const SORT_OPTIONS = [
  { value: "recently_changed", label: "Recently Changed" },
  { value: "date", label: "Date Created" },
  { value: "name", label: "Name (A-Z)" },
];

export default function ClusterWorkspace() {
  const { isViewer } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sortBy, setSortBy] = useState("recently_changed");

  const {
    id,
    cluster,
    mocktests,
    isLoading,
    actionError,
    showModal,
    setShowModal,
    editing,
    setEditing,
    editForm,
    setEditForm,
    stats,
    handleDeleteCluster,
    handleSaveEdit,
    startEdit,
  } = useClusterWorkspace();

  const sortedMockTests = useMemo(() => {
    if (!mocktests || mocktests.length === 0) return [];
    const items = [...mocktests];

    switch (sortBy) {
      case "name":
        return items.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );
      case "date":
        return items.sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
        );
      case "recently_changed":
      default:
        return items.sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at || 0) -
            new Date(a.updated_at || a.created_at || 0),
        );
    }
  }, [mocktests, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="text-center py-20">
        <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">
          Cluster not found
        </h2>
      </div>
    );
  }

  const { processingCount, readyCount, reviewCount } = stats;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="surface-card rounded-2xl p-4 sm:p-6 border border-border">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            {editing ? (
              <div className="flex-1 space-y-2 min-w-0">
                <input
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((form) => ({
                      ...form,
                      name: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-base sm:text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((form) => ({
                      ...form,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Description..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none text-foreground"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 sm:flex-none px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold rounded-xl transition-all"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 sm:flex-none px-4 py-2 border border-border text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight wrap-break-word">
                  {cluster.name}
                </h1>
                {cluster.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2 sm:line-clamp-none">
                    {cluster.description}
                  </p>
                )}
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 font-medium">
                  {mocktests.length} mock test
                  {mocktests.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
          {!editing && (
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                disabled={isViewer}
                onClick={() => !isViewer && startEdit()}
                className={`w-9 h-9 rounded-md border flex items-center justify-center transition-all ${
                  isViewer
                    ? "border-border text-muted-foreground/30 cursor-not-allowed opacity-50"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-blue-500 hover:bg-blue-500/15"
                }`}
                title={
                  isViewer ? "Editor role is required to edit cluster" : "Edit"
                }
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                disabled={isViewer}
                onClick={() => !isViewer && setShowDeleteConfirm(true)}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                  isViewer
                    ? "border-red-500/10 text-red-500/30 cursor-not-allowed opacity-50"
                    : "border-red-500/20 hover:bg-red-500/15 text-muted-foreground hover:text-red-500 hover:border-red-500"
                }`}
                title={
                  isViewer
                    ? "Editor role is required to delete cluster"
                    : "Delete"
                }
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {actionError && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
            {actionError}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {[
            {
              label: "Total Mock Tests",
              value: mocktests.length,
              icon: FileText,
              color: "text-orange-500 bg-orange-500/15",
            },
            {
              label: "Processing",
              value: processingCount,
              icon: Zap,
              color: "text-blue-500 bg-blue-500/15",
            },
            {
              label: "Needs Review",
              value: reviewCount,
              icon: AlertTriangle,
              color: "text-amber-500 bg-amber-500/15",
            },
            {
              label: "Ready",
              value: readyCount,
              icon: CheckCircle,
              color: "text-emerald-500 bg-emerald-500/15",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="surface-card rounded-xl p-3 sm:p-3.5 border border-border flex items-center gap-2.5 sm:gap-3 min-w-0"
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${stat.color} shrink-0`}
              >
                <stat.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg sm:text-xl font-bold text-foreground truncate">
                  {stat.value}
                </div>
                <div className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Mock Tests
          </h2>
          {mocktests.length > 0 && (
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
              {mocktests.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {mocktests.length > 1 && (
            <div className="relative flex-1 sm:flex-initial">
              <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort mock tests"
                className="w-full sm:w-auto appearance-none pl-8 pr-7 py-2 text-xs sm:text-sm font-semibold rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all cursor-pointer shadow-xs"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            disabled={isViewer}
            onClick={() => !isViewer && setShowModal(true)}
            title={
              isViewer ? "Editor role is required to add mock tests" : undefined
            }
            className={`flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-md text-xs sm:text-sm shadow-xs transition-all ${
              mocktests.length > 1
                ? "flex-1 sm:flex-initial"
                : "w-full sm:w-auto"
            } ${
              isViewer
                ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            <Plus className="w-4 h-4" /> Add Mock Test
          </button>
        </div>
      </div>

      {mocktests.length === 0 ? (
        <div className="surface-card rounded-2xl p-8 sm:p-12 text-center border border-border">
          <FileText className="w-10 h-10 text-orange-500/60 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground mb-1">
            No mock tests yet
          </h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
            Upload a PDF or create a manual mock test in this cluster.
          </p>
          <button
            disabled={isViewer}
            onClick={() => !isViewer && setShowModal(true)}
            title={
              isViewer ? "Editor role is required to add mock tests" : undefined
            }
            className={`w-full sm:w-auto px-4 py-2.5 font-semibold rounded-xl text-xs shadow-xs transition-all ${
              isViewer
                ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
            }`}
          >
            Add Mock Test
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {sortedMockTests.map((mocktest) => (
            <MockTestCard
              key={mocktest.id}
              mocktest={mocktest}
              clusterId={id}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateMockTestModal
          clusterId={id}
          onClose={() => setShowModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title={`Delete "${cluster?.name}"?`}
          description="Are you sure you want to delete this cluster and all its mock tests? This action cannot be undone."
          confirmLabel="Delete Cluster"
          destructive={true}
          onConfirm={async () => {
            setShowDeleteConfirm(false);
            await handleDeleteCluster();
          }}
        />
      )}
    </div>
  );
}
