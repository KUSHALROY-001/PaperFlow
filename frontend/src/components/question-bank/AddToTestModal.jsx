import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { SkeletonRowList } from "@/components/ui/skeleton-row";

const fieldClass =
  "w-full px-3 py-2 text-sm rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30";

// Searchable picker over every mock test in the workspace (GET
// /api/mock-tests, already cluster-joined - see api.js#listAllMockTests)
// with client-side text filtering rather than a new backend endpoint,
// since this app has no combobox/command-palette component to reuse and
// a workspace's mock test count is small enough that filtering a
// pre-fetched list is plenty fast.
//
// Deliberately does NOT auto-close after a successful add - lastMockTestId
// (owned by useQuestionBank.js) persists the chosen target across modal
// opens, so adding several bank questions to the same mock test in a row
// doesn't mean re-searching for it each time; this modal reopens with it
// already selected.
//
// Shared by both single-question "Add to Test" (one card's button) and
// Phase 3's bulk "Add N to Test" (the selection bar) - the modal itself
// doesn't know or care which mode it's in. `onConfirm(targetMockTestId)`
// always resolves to { copiedCount, failedCount }, and `summary` is
// whatever ReactNode the caller wants shown under the title (a single
// question's preview text, or "12 questions selected") - see
// QuestionBank.jsx for how each mode wires this in.
export default function AddToTestModal({
  summary,
  resetKey,
  lastMockTestId,
  onClose,
  onConfirm,
  actionError,
  isViewer,
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(lastMockTestId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { copiedCount, failedCount } | null

  const { data, isLoading } = useQuery({
    queryKey: ["mock-tests", "all"],
    queryFn: () => api.listAllMockTests(),
  });

  const mockTests = data?.mockTests || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return mockTests;
    return mockTests.filter(
      (mt) =>
        mt.name.toLowerCase().includes(term) ||
        (mt.cluster_name || "").toLowerCase().includes(term),
    );
  }, [mockTests, search]);

  // Drops any in-progress result state left over from a previous
  // open/attempt whenever what's being added changes - the modal
  // component instance can persist across a resetKey change (React keeps
  // the same instance mounted when the conditional-render guard around it
  // stays truthy, e.g. switching which single question is targeted while
  // it's open), so this can't just rely on a fresh mount to clear it.
  useEffect(() => {
    setResult(null);
  }, [resetKey]);

  const handleConfirm = async () => {
    if (!selectedId || isViewer) return;
    setIsSubmitting(true);
    const outcome = await onConfirm(selectedId);
    setIsSubmitting(false);
    setResult(outcome);
  };

  const selectedMockTest = mockTests.find((mt) => mt.id === selectedId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[85vh] overflow-y-auto surface-card border border-border rounded-3xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-bold text-foreground">Add to Test</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground mb-4 line-clamp-2">
          {summary}
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mock tests..."
            className={`${fieldClass} pl-9`}
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1.5 mb-4">
          {isLoading && (
            <SkeletonRowList count={4} className="border-0 rounded-none bg-transparent space-y-1.5" />
          )}
          {!isLoading && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No mock tests match "{search}".
            </p>
          )}
          {filtered.map((mt) => (
            <button
              key={mt.id}
              type="button"
              onClick={() => {
                setSelectedId(mt.id);
                setResult(null);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                selectedId === mt.id
                  ? "border-orange-500/40 bg-orange-500/10"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              <div className="text-sm font-semibold text-foreground truncate">
                {mt.name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {mt.cluster_name}
              </div>
            </button>
          ))}
        </div>

        {actionError && (
          <p className="text-xs font-bold text-red-500 mb-3">{actionError}</p>
        )}

        {result ? (
          result.failedCount === 0 ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {result.copiedCount > 1
                  ? `Added all ${result.copiedCount} questions to ${selectedMockTest?.name}.`
                  : `Added to ${selectedMockTest?.name}.`}{" "}
                Pick another mock test above, or close this and keep browsing
                the bank.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-400">
                {result.copiedCount > 0
                  ? `Added ${result.copiedCount} question${result.copiedCount === 1 ? "" : "s"}, but ${result.failedCount} couldn't be copied.`
                  : `Couldn't copy ${result.failedCount === 1 ? "this question" : `any of these ${result.failedCount} questions`}.`}{" "}
                The failed one{result.failedCount === 1 ? "" : "s"} stayed
                selected - try again, or close this and check them individually.
              </p>
            </div>
          )
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border bg-card text-foreground font-semibold rounded-xl hover:bg-muted text-xs sm:text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedId || isSubmitting || isViewer}
              onClick={handleConfirm}
              title={
                isViewer
                  ? "Editor role is required to add questions"
                  : undefined
              }
              className={`flex-1 py-2.5 font-bold rounded-xl text-xs sm:text-sm transition-all ${
                !selectedId || isSubmitting || isViewer
                  ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50 border border-border"
                  : "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20"
              }`}
            >
              {isSubmitting ? "Adding..." : "Add to Test"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
