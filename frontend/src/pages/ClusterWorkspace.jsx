import { useState } from "react";
import {
  AlertTriangle,
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

export default function ClusterWorkspace() {
  const { isViewer } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      <div className="surface-card rounded-2xl p-3 sm:p-6 border border-border">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 bg-orange-500/15 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
              <FolderOpen className="w-6 h-6" />
            </div>
            {editing ? (
              <div className="flex-1 space-y-2">
                <input
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((form) => ({
                      ...form,
                      name: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30"
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
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none text-foreground"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold rounded-xl"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-1.5 border border-border text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                  {cluster.name}
                </h1>
                {cluster.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {cluster.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  {mocktests.length} mock test
                  {mocktests.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
          {!editing && (
            <div className="flex items-center gap-2">
              <button
                disabled={isViewer}
                onClick={() => !isViewer && startEdit()}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                  isViewer
                    ? "border-border text-muted-foreground/30 cursor-not-allowed opacity-50"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-orange-500/40"
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
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                  isViewer
                    ? "border-red-500/10 text-red-500/30 cursor-not-allowed opacity-50"
                    : "border-red-500/20 text-muted-foreground hover:text-red-500 hover:border-red-500/40"
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

        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-4 gap-3">
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
              className="surface-card rounded-xl p-3.5 border border-border flex items-center gap-3"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.color} shrink-0`}
              >
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">Mock Tests</h2>
        <button
          disabled={isViewer}
          onClick={() => !isViewer && setShowModal(true)}
          title={
            isViewer ? "Editor role is required to add mock tests" : undefined
          }
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition-all w-full sm:w-auto justify-center ${
            isViewer
              ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
              : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
          }`}
        >
          <Plus className="w-4 h-4" /> Add Mock Test
        </button>
      </div>

      {mocktests.length === 0 ? (
        <div className="surface-card rounded-2xl p-12 text-center border border-border">
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
            className={`px-4 py-2.5 font-semibold rounded-xl text-xs shadow-sm transition-all ${
              isViewer
                ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
            }`}
          >
            Add Mock Test
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mocktests.map((mocktest) => (
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
