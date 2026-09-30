import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Clock, FileText } from "lucide-react";
import { formatTimeAgo } from "@/lib/date";
import { clusterMockTestStatusConfig } from "@/utils/clusterHelpers";
import CardActionMenu from "../design-system/CardActionMenu";
import RenameModal from "../design-system/RenameModal";
import { ConfirmDialog } from "../design-system/ConfirmDialog";
import { api } from "@/lib/api";

// One row in the Mock Tests table view (ClusterWorkspace.jsx). Mirrors
// MockTestCard.jsx's rename/delete handling exactly (same endpoints, same
// cache invalidation) so switching between grid and table doesn't change
// how those actions behave - only the layout differs.
export default function MockTestRow({ mocktest, clusterId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const status =
    clusterMockTestStatusConfig[mocktest.status] ||
    clusterMockTestStatusConfig.draft;
  const isProcessing = mocktest.status === "processing";

  const handleRowClick = () => {
    navigate(`/cluster/${clusterId}/mocktest/${mocktest.id}`);
  };

  const handleRenameSave = async (newName) => {
    await api.updateMockTest(mocktest.id, { name: newName });
    await queryClient.invalidateQueries({ queryKey: ["cluster", clusterId] });
    await queryClient.invalidateQueries({
      queryKey: ["mock-tests", clusterId],
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.deleteMockTest(mocktest.id);
      queryClient.setQueryData(["mock-tests", clusterId], (old) => {
        if (!old?.mockTests) return old;
        return {
          ...old,
          mockTests: old.mockTests.filter((m) => m.id !== mocktest.id),
        };
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mock-tests", clusterId] }),
        queryClient.invalidateQueries({ queryKey: ["cluster", clusterId] }),
        queryClient.invalidateQueries({ queryKey: ["clusters"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
      setShowDelete(false);
    } catch (error) {
      console.error("Failed to delete mock test:", error);
    }
  };

  return (
    <>
      <div
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleRowClick();
          }
        }}
        role="button"
        tabIndex={0}
        className="grid min-w-180 grid-cols-[2.5fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors last:border-0 group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 text-orange-500 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p
              className={`font-semibold text-sm truncate transition-colors ${
                isProcessing
                  ? "text-shimmer text-foreground"
                  : "text-foreground group-hover:text-orange-500"
              }`}
            >
              {mocktest.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {mocktest.description || "Manual mock test"}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${
            isProcessing
              ? "animate-pulse bg-orange-500/15 text-orange-500 border border-orange-500/40"
              : status.color
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${isProcessing ? "bg-orange-500 animate-ping" : status.dot}`}
          />
          {status.label}
        </span>

        <span className="text-sm text-muted-foreground font-medium">
          {Number(mocktest.total_questions) > 0
            ? `${mocktest.total_questions} Q`
            : "—"}
        </span>

        <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          {formatTimeAgo(mocktest.created_at)}
        </span>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-500 border border-orange-500/30 group-hover:bg-orange-500/10 rounded-xl transition-colors">
            Open <ArrowRight className="w-3 h-3" />
          </span>
          <CardActionMenu
            onRename={() => setShowRename(true)}
            onDelete={() => setShowDelete(true)}
          />
        </div>
      </div>

      {showRename && (
        <RenameModal
          isOpen={showRename}
          title="Rename Mock Test"
          initialName={mocktest.name}
          showDescription={false}
          onClose={() => setShowRename(false)}
          onSave={handleRenameSave}
        />
      )}

      {showDelete && (
        <ConfirmDialog
          open={showDelete}
          onOpenChange={(open) => !open && setShowDelete(false)}
          title={`Delete "${mocktest.name}"?`}
          description="Are you sure you want to delete this mock test? This action cannot be undone."
          confirmLabel="Delete Mock Test"
          destructive={true}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
}
