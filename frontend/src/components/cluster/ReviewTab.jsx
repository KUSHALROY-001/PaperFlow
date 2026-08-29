import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Flag,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { ConfirmDialog } from "../design-system/ConfirmDialog";
import QuestionContent, {
  QuestionDiagram,
  QuestionExplanation,
} from "../shared/QuestionContent";
import MathText from "../shared/MathText";
import { DiagramAssetsProvider } from "@/lib/diagramAssetsContext";
import QuestionJumpInput from "../shared/QuestionJumpInput";
import ScrollToTopButton from "../shared/ScrollToTopButton";

const filters = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "review", label: "Needs Review" },
  { id: "rejected", label: "Flagged" },
  { id: "low_confidence", label: "Low Confidence" },
];

function getConfidenceTone(confidence) {
  if (confidence >= 90) {
    return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
  }
  if (confidence >= 70) {
    return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
  }
  return "bg-red-500/10 text-red-500 border border-red-500/20";
}

export default function ReviewTab({
  questions,
  onStatusChange,
  onDelete,
  clusterId: propClusterId,
  mockTestId: propMockTestId,
}) {
  const { isViewer } = useAuth();
  const params = useParams();
  const clusterId = propClusterId || params.clusterId;
  const mockTestId = propMockTestId || params.mockTestId;
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState(
    [questions[0]?.id].filter(Boolean),
  );
  const [deleteTarget, setDeleteTarget] = useState(null);
  // Set by handleJumpToQuestion, consumed by the effect below. Needed
  // (not a plain scrollIntoView call inline) because jumping to a
  // question can require two state changes to even render its DOM node
  // first - clearing an active filter that excludes it, and expanding it
  // if collapsed - and the scroll has to wait for whichever of those
  // actually happens.
  const [pendingScrollTo, setPendingScrollTo] = useState(null);

  // Returns true/false (found or not) - QuestionJumpInput owns showing
  // the "not found" message itself based on this return value. Searches
  // the full `questions` list, not filteredQuestions - a question hidden
  // by the current filter should still be jumpable to, not reported as
  // "not found".
  const handleJumpToQuestion = (questionNo) => {
    const target = questions.find((q) => q.questionNo === questionNo);
    if (!target) return false;
    setActiveFilter("all");
    setExpandedIds((current) =>
      current.includes(target.id) ? current : [...current, target.id],
    );
    setPendingScrollTo(target.questionNo);
    return true;
  };

  const filteredQuestions = useMemo(() => {
    if (activeFilter === "all") {
      return questions;
    }
    if (activeFilter === "low_confidence") {
      return questions.filter(
        (question) => Number(question.confidence || 0) < 70,
      );
    }

    return questions.filter((question) => question.status === activeFilter);
  }, [activeFilter, questions]);

  const summary = useMemo(
    () => ({
      approved: questions.filter((question) => question.status === "approved")
        .length,
      review: questions.filter((question) => question.status === "review")
        .length,
      flagged: questions.filter((question) => question.status === "rejected")
        .length,
      lowConfidence: questions.filter(
        (question) => Number(question.confidence || 0) < 70,
      ).length,
    }),
    [questions],
  );

  const toggleExpanded = (questionId) => {
    setExpandedIds((currentIds) =>
      currentIds.includes(questionId)
        ? currentIds.filter((id) => id !== questionId)
        : [...currentIds, questionId],
    );
  };

  useEffect(() => {
    if (pendingScrollTo == null) return undefined;
    const el = document.getElementById(`question-${pendingScrollTo}`);
    // Not in the DOM yet on this render (filter/expand state just
    // changed and hasn't repainted) - do nothing and let the next run of
    // this effect, triggered by activeFilter/filteredQuestions changing,
    // try again.
    if (!el) return undefined;

    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-orange-500", "ring-offset-2");
    const timeoutId = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-orange-500", "ring-offset-2");
    }, 1600);
    setPendingScrollTo(null);
    return () => window.clearTimeout(timeoutId);
  }, [pendingScrollTo, activeFilter, filteredQuestions]);

  return (
    <div className="space-y-6 font-inter">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#ea580c] text-white shadow-xs"
                      : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          <QuestionJumpInput onJump={handleJumpToQuestion} />
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-sm sm:px-4">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-500">
              Approved
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {summary.approved}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-sm sm:px-4">
            <div className="text-xs font-bold uppercase tracking-wide text-amber-500">
              Needs Review
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {summary.review}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-sm sm:px-4">
            <div className="text-xs font-bold uppercase tracking-wide text-amber-500">
              Flagged
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {summary.flagged}
            </div>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm sm:px-4">
            <div className="text-xs font-bold uppercase tracking-wide text-red-500">
              Low Confidence
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {summary.lowConfidence}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredQuestions.map((question) => {
          const expanded = expandedIds.includes(question.id);
          const isApproved = question.status === "approved";
          const isFlagged = question.status === "rejected";

          return (
            <div
              key={question.id}
              id={`question-${question.questionNo}`}
              className={`rounded-3xl p-3 sm:p-5 surface-card border transition-all ${
                isApproved
                  ? "border-emerald-500/30"
                  : isFlagged
                    ? "border-amber-500/30"
                    : "border-border"
              }`}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="rounded-full bg-orange-500/15 border border-orange-500/20 px-3 py-1 text-xs font-bold text-orange-500 shrink-0">
                        Q{question.questionNo}
                      </span>
                      <span className="rounded-full bg-muted border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                        {question.topic}
                      </span>
                      {question.subtopic && (
                        <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
                          {question.subtopic}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getConfidenceTone(question.confidence)}`}
                      >
                        {question.confidence}% confidence
                      </span>
                      {isApproved && (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-500 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {isFlagged && (
                        <span className="rounded-full bg-amber-500/15 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-500 flex items-center gap-1">
                          <Flag className="w-3 h-3" /> Flagged
                        </span>
                      )}
                    </div>
                    {clusterId && mockTestId && (
                      <Link
                        to={`/cluster/${clusterId}/mock/${mockTestId}/editor?qId=${question.id}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:border-orange-500/40 hover:text-orange-500 hover:bg-orange-500/10 shrink-0"
                        title={`Edit Question ${question.questionNo} in Question Editor`}
                      >
                        <Edit2 className="h-4 w-4 text-orange-500" />
                      </Link>
                    )}
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExpanded(question.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleExpanded(question.id);
                      }
                    }}
                    className="w-full text-left cursor-pointer"
                  >
                    <DiagramAssetsProvider assets={question.diagramAssets}>
                      <QuestionContent
                        text={question.text}
                        passage={question.passage}
                        diagramUrl={question.diagramUrl}
                        placement={question.placement}
                        textClassName="text-base sm:text-lg text-foreground"
                      />
                    </DiagramAssetsProvider>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Source: {question.sourceLine}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={() =>
                      !isViewer &&
                      onStatusChange(
                        question.id,
                        isApproved ? "review" : "approved",
                      )
                    }
                    className={`rounded-xl p-2 transition-all ${
                      isViewer
                        ? "opacity-50 cursor-not-allowed border border-emerald-500/20 text-emerald-500"
                        : isApproved
                          ? "bg-emerald-500 text-white border border-emerald-500 shadow-xs hover:bg-emerald-600"
                          : "border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10"
                    }`}
                    aria-label="Approve question"
                    title={
                      isViewer
                        ? "Editor role is required to approve questions"
                        : isApproved
                          ? "Approved (click to unapprove)"
                          : "Approve question"
                    }
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={() =>
                      !isViewer &&
                      onStatusChange(
                        question.id,
                        isFlagged ? "review" : "rejected",
                      )
                    }
                    className={`rounded-xl p-2 transition-all ${
                      isViewer
                        ? "opacity-50 cursor-not-allowed border border-amber-500/20 text-amber-500"
                        : isFlagged
                          ? "bg-amber-500 text-white border border-amber-500 shadow-xs hover:bg-amber-600"
                          : "border border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
                    }`}
                    aria-label="Flag question"
                    title={
                      isViewer
                        ? "Editor role is required to flag questions"
                        : isFlagged
                          ? "Flagged (click to unflag)"
                          : "Flag question"
                    }
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={() => !isViewer && setDeleteTarget(question)}
                    className={`rounded-xl border border-red-500/20 p-2 text-red-500 transition-colors ${
                      isViewer
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-red-500/10"
                    }`}
                    aria-label="Delete question"
                    title={
                      isViewer
                        ? "Editor role is required to delete questions"
                        : "Delete question"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(question.id)}
                    className="rounded-xl border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Expand question details"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="mt-5 space-y-3 rounded-2xl border border-border bg-muted/40 p-2 sm:p-4">
                  <DiagramAssetsProvider assets={question.diagramAssets}>
                  {question.options.map((option) => {
                    const correct = option === question.answer;
                    return (
                      <div
                        key={option}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-3 text-xs sm:px-4 sm:text-sm ${
                          correct
                            ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                            : "bg-card text-muted-foreground border border-border"
                        }`}
                      >
                        <span className="whitespace-pre-wrap wrap-break-word">
                          <MathText text={option} />
                        </span>
                        {correct && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold">
                            <CheckCircle2 className="h-4 w-4" />
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {question.placement === "below_options" && (
                    <QuestionDiagram diagramUrl={question.diagramUrl} />
                  )}
                  <QuestionExplanation explanation={question.explanation} />
                  </DiagramAssetsProvider>
                  {question.status === "rejected" && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-500">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Needs manual review before export
                    </div>
                  )}
                  {question.aiIssues?.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-500">
                      <div className="mb-1 font-bold">AI review notes</div>
                      <ul className="list-disc space-y-1 pl-5">
                        {question.aiIssues.map((issue, index) => (
                          <li key={`${question.id}-issue-${index}`}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title={`Delete Q${deleteTarget.questionNo}?`}
          description="Are you sure you want to delete this question? This action cannot be undone."
          confirmLabel="Delete Question"
          destructive={true}
          onConfirm={async () => {
            await onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
      <ScrollToTopButton />
    </div>
  );
}
