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

export default function MockTestCard({ mocktest, clusterId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const status =
    clusterMockTestStatusConfig[mocktest.status] ||
    clusterMockTestStatusConfig.draft;
  const isProcessing = mocktest.status === "processing";

  const handleCardClick = () => {
    navigate(`/cluster/${clusterId}/mocktest/${mocktest.id}`);
  };

  const handleRenameSave = async (newName) => {
    await api.updateMockTest(mocktest.id, { name: newName });
    queryClient.invalidateQueries({ queryKey: ["cluster", clusterId] });
    queryClient.invalidateQueries({ queryKey: ["mockTests", clusterId] });
  };

  const handleDeleteConfirm = async () => {
    await api.deleteMockTest(mocktest.id);
    queryClient.invalidateQueries({ queryKey: ["cluster", clusterId] });
    queryClient.invalidateQueries({ queryKey: ["mockTests", clusterId] });
    setShowDelete(false);
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`group cursor-pointer transition-all ${
          isProcessing
            ? "relative p-0.5 rounded-2xl overflow-hidden shadow-lg"
            : "surface-card rounded-2xl p-5 border border-border hover:border-orange-500/40 flex flex-col justify-between"
        }`}
      >
        {/* Continuous Rotating RGB Border Glow when mocktest is in running/processing phase */}
        {isProcessing && (
          <div className="absolute inset-[-200%] animate-rgb-border bg-[conic-gradient(from_0deg,#ff4500,#ffaa00,#00e5ff,#7600ff,#ff007f,#ff4500)] opacity-100" />
        )}

        <div
          className={
            isProcessing
              ? "surface-card rounded-[14px] p-5 relative z-10 bg-card h-full flex flex-col justify-between"
              : "flex flex-col justify-between h-full"
          }
        >
          <div>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                {/* Blinking / Pulsing "Processing" status badge when in running phase */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isProcessing
                      ? "animate-pulse bg-orange-500/15 text-orange-500 border border-orange-500/40 ring-2 ring-orange-500/20 font-extrabold"
                      : status.color
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isProcessing ? "bg-orange-500 animate-ping" : status.dot
                    }`}
                  />
                  {status.label}
                </span>
                <CardActionMenu
                  onRename={() => setShowRename(true)}
                  onDelete={() => setShowDelete(true)}
                />
              </div>
            </div>
            <h3 className="font-bold text-foreground mb-1 truncate text-base group-hover:text-orange-500 transition-colors">
              {mocktest.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate">
                {mocktest.description || "Manual mock test"}
              </span>
            </div>
            <div className="flex gap-2 mb-3 flex-wrap">
              {mocktest.exam_year && (
                <span className="text-xs bg-orange-500/10 text-orange-500 font-semibold px-2 py-0.5 rounded-lg border border-orange-500/20">
                  {mocktest.exam_year}
                </span>
              )}
              {Number(mocktest.total_questions) > 0 && (
                <span className="text-xs bg-purple-500/15 text-purple-400 dark:text-purple-300 font-semibold px-2 py-0.5 rounded-lg">
                  {mocktest.total_questions} Q
                </span>
              )}
            </div>
            {isProcessing && (
              <div className="mb-3">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange-500 animate-pulse"
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />{" "}
              {formatTimeAgo(mocktest.created_at)}
            </span>
            <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-500 border border-orange-500/30 group-hover:bg-orange-500/10 rounded-lg transition-colors">
              Open <ArrowRight className="w-3 h-3" />
            </span>
          </div>
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
