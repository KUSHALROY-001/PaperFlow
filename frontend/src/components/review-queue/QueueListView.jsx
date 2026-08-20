import { Check, Flag, Loader2 } from "lucide-react";
import { getConfidenceTone } from "./QueueQuestionCard";

// The Phase 3 counterpart to QueueQuestionCard's one-at-a-time focus view -
// deliberately plain-text-preview only (no MathText/QuestionContent
// rendering per row), since this view exists for the "these 10 are all
// obviously fine, I don't need to study each one" case. Anyone who needs
// to actually read a question closely belongs in focus view instead.
export default function QueueListView({
  items,
  selectedIds,
  onToggle,
  onToggleAll,
  onBulkApprove,
  onBulkReject,
  isBusy,
  isViewer,
  hasMore,
  isFetchingMore,
  onLoadMore,
}) {
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-3 pb-20">
      <label className="flex items-center gap-2.5 px-1 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAll}
          className="h-4 w-4 rounded border-border accent-[#ea580c]"
        />
        <span className="text-xs font-semibold text-muted-foreground">
          {someSelected
            ? `${selectedIds.size} selected`
            : `Select all ${items.length} loaded`}
        </span>
      </label>

      <div className="space-y-1.5">
        {items.map((question) => {
          const checked = selectedIds.has(question.id);
          return (
            <label
              key={question.id}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                checked
                  ? "border-orange-500/40 bg-orange-500/5"
                  : "border-border hover:bg-muted"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(question.id)}
                className="mt-1 h-4 w-4 rounded border-border accent-[#ea580c] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-orange-500 shrink-0">
                    Q{question.questionNo}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {question.clusterName} / {question.mockTestName}
                  </span>
                  <span
                    className={`ml-auto shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${getConfidenceTone(question.confidence)}`}
                  >
                    {question.confidence === null ||
                    question.confidence === undefined
                      ? "—"
                      : `${question.confidence}%`}
                  </span>
                </div>
                <p className="text-xs text-foreground line-clamp-2">
                  {question.text}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingMore}
          className="w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isFetchingMore ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
            </span>
          ) : (
            "Load more"
          )}
        </button>
      )}

      {someSelected && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-2xl border border-border bg-card shadow-lg px-4 py-3">
          <span className="text-sm font-bold text-foreground">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            disabled={isViewer || isBusy}
            onClick={onBulkReject}
            title={
              isViewer ? "Editor role is required to reject questions" : undefined
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3.5 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Flag className="w-3.5 h-3.5" /> Reject selected
          </button>
          <button
            type="button"
            disabled={isViewer || isBusy}
            onClick={onBulkApprove}
            title={
              isViewer ? "Editor role is required to approve questions" : undefined
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Approve selected
          </button>
        </div>
      )}
    </div>
  );
}
