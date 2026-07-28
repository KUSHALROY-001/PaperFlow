import { memo } from "react";
import { AlertCircle, GripVertical, Trash2 } from "lucide-react";

// Promoted from an inline function inside pages/QuestionEditor.jsx.
//
// Wrapped in React.memo: this renders once per question in the sidebar
// list. Paired with the stable onSelect/onDelete handlers from
// useQuestionEditor (see that file's comments), editing the text of the
// currently-selected question no longer re-renders every other card in
// the list on each keystroke.
function QuestionCard({ q, isSelected, onSelect, onDelete, issues }) {
  return (
    <div
      onClick={() => onSelect(q.id)}
      className={`p-4 rounded-2xl border cursor-pointer transition-all ${isSelected ? "border-orange-500 bg-orange-500/10 dark:bg-orange-500/15" : "border-border bg-card hover:border-orange-500/40"}`}
    >
      <div className="flex items-start gap-3">
        <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-bold text-foreground truncate">
            {q.text}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-lg font-bold">
              Q{q.questionNo}
            </span>
            <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-lg font-bold">
              {q.topic}
            </span>
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
          onClick={(e) => {
            e.stopPropagation();
            onDelete(q.id);
          }}
          className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default memo(QuestionCard);
