import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Flag,
  ShieldAlert,
  Trash2,
} from "lucide-react";

const filters = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "review", label: "Needs Review" },
  { id: "rejected", label: "Flagged" },
];

function getConfidenceTone(confidence) {
  if (confidence >= 90) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200";
  }
  if (confidence >= 70) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200";
  }
  return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200";
}

export default function ReviewTab({ questions, onStatusChange, onDelete }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState([questions[0]?.id].filter(Boolean));

  const filteredQuestions = useMemo(() => {
    if (activeFilter === "all") {
      return questions;
    }

    return questions.filter((question) => question.status === activeFilter);
  }, [activeFilter, questions]);

  const summary = useMemo(
    () => ({
      approved: questions.filter((question) => question.status === "approved").length,
      review: questions.filter((question) => question.status === "review").length,
      flagged: questions.filter((question) => question.status === "rejected").length,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const active = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "gradient-violet text-white"
                    : "bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-white/5 dark:text-violet-200 dark:hover:bg-white/10"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
              Approved
            </div>
            <div className="mt-1 text-xl font-bold text-emerald-800 dark:text-white">
              {summary.approved}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
              Needs Review
            </div>
            <div className="mt-1 text-xl font-bold text-amber-800 dark:text-white">
              {summary.review}
            </div>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-500/20 dark:bg-red-500/10">
            <div className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-200">
              Flagged
            </div>
            <div className="mt-1 text-xl font-bold text-red-800 dark:text-white">
              {summary.flagged}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredQuestions.map((question) => {
          const expanded = expandedIds.includes(question.id);

          return (
            <div key={question.id} className="rounded-3xl p-4 card-lavender">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <button
                  type="button"
                  onClick={() => toggleExpanded(question.id)}
                  className="flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-white/5 dark:text-violet-200">
                      {question.topic}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getConfidenceTone(question.confidence)}`}
                    >
                      {question.confidence}% confidence
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-foreground">
                    {question.text}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Source: {question.sourceLine}
                  </p>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onStatusChange(question.id, "approved")}
                    className="rounded-xl border border-emerald-200 p-2 text-emerald-600 transition-colors hover:bg-emerald-50 dark:border-emerald-500/20 dark:hover:bg-emerald-500/10"
                    aria-label="Approve question"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onStatusChange(question.id, "rejected")}
                    className="rounded-xl border border-amber-200 p-2 text-amber-600 transition-colors hover:bg-amber-50 dark:border-amber-500/20 dark:hover:bg-amber-500/10"
                    aria-label="Flag question"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(question.id)}
                    className="rounded-xl border border-red-200 p-2 text-red-500 transition-colors hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
                    aria-label="Delete question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(question.id)}
                    className="rounded-xl border border-violet-200 p-2 text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:hover:bg-white/5 dark:hover:text-violet-200"
                    aria-label="Expand question details"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="mt-5 space-y-3 rounded-2xl border border-violet-100 bg-violet-50/55 p-4 dark:border-white/10 dark:bg-white/5">
                  {question.options.map((option) => {
                    const correct = option === question.answer;
                    return (
                      <div
                        key={option}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${
                          correct
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100"
                            : "bg-white text-slate-600 dark:bg-slate-900/70 dark:text-slate-200"
                        }`}
                      >
                        <span>{option}</span>
                        {correct && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold">
                            <CheckCircle2 className="h-4 w-4" />
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {question.status === "rejected" && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-200">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Needs manual review before export
                    </div>
                  )}
                  {question.aiIssues?.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                      <div className="mb-1 font-semibold">AI review notes</div>
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
    </div>
  );
}
