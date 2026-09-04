import MarksBadge from "@/components/shared/MarksBadge";
import { memo } from "react";
import { AlertCircle, GripVertical, ImageIcon, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import MathText from "../shared/MathText";
import { DiagramAssetsProvider } from "@/lib/diagramAssetsContext";

function QuestionCard({
  q,
  index,
  isSelected,
  onSelect,
  onDelete,
  issues,
  onCardMouseDown,
  onCardMouseEnter,
  isDragging,
  isDragOver,
}) {
  const { isViewer } = useAuth();

  const hasDiagram = Boolean(q.diagramUrl);

  return (
    <div
      onMouseDown={(e) => {
        if (isViewer) return;
        if (e.target.closest("button")) return;
        onCardMouseDown(e, index);
      }}
      onMouseEnter={() => !isViewer && onCardMouseEnter(index)}
      onClick={() => onSelect(q.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(q.id);
        }
      }}
      role="button"
      tabIndex={0}
      className={`relative p-4 rounded-2xl border transition-all duration-150 select-none ${
        isViewer
          ? "cursor-default border-border bg-card"
          : "cursor-grab active:cursor-grabbing"
      } ${
        isDragging
          ? "opacity-30 border-2 border-dashed border-orange-500/60 bg-orange-500/10 scale-[0.98]"
          : isDragOver
            ? "border-2 border-orange-500 bg-orange-500/20 dark:bg-orange-500/25 ring-2 ring-orange-500/40 shadow-md transform translate-y-0.5 scale-[1.01]"
            : isSelected
              ? "border-orange-500 bg-orange-500/10 dark:bg-orange-500/15"
              : "border-border bg-card hover:border-orange-500/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-0.5 rounded transition-colors ${
            isViewer
              ? "text-muted-foreground/30 cursor-not-allowed"
              : "text-muted-foreground hover:text-orange-500"
          }`}
          title={
            isViewer
              ? "Editor role is required to reorder questions"
              : undefined
          }
        >
          <GripVertical className="w-4 h-4 mt-0.5 shrink-0" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-bold text-foreground truncate">
            <DiagramAssetsProvider assets={q.diagramAssets}>
              <MathText text={q.text} />
            </DiagramAssetsProvider>
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-lg font-bold">
              Q{q.questionNo}
            </span>
            <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-lg font-bold truncate max-w-30">
              {q.topic}
            </span>
            <MarksBadge
              marksPerCorrect={q.marksPerCorrect}
              negativeMarksPerWrong={q.negativeMarksPerWrong}
            />
            {!q.persisted && (
              <span className="text-xs bg-amber-500/15 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-lg font-bold">
                Draft
              </span>
            )}
            {issues > 0 && (
              <span className="text-xs bg-red-500/15 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {issues} issue{issues > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <button
          disabled={isViewer}
          onClick={(e) => {
            e.stopPropagation();
            if (!isViewer) onDelete(q.id);
          }}
          className={`w-7 h-7 rounded-md border hover:border-red-500 flex items-center justify-center transition-colors shrink-0 ${
            isViewer
              ? "text-muted-foreground/30 cursor-not-allowed opacity-50"
              : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
          }`}
          title={
            isViewer
              ? "Editor role is required to delete questions"
              : "Delete question"
          }
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {hasDiagram && (
        <div className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card/90 shadow-sm backdrop-blur-sm">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export default memo(QuestionCard);
