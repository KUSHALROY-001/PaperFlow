import { BookOpen, ChevronRight, Download, Star, X } from "lucide-react";
import { iconBgMap } from "@/utils/templateHelpers";
import StarRatingInput from "./StarRatingInput";

// Promoted from inline JSX inside pages/Templates.jsx — no behavior changes.
export default function TemplatePreviewModal({
  template,
  onClose,
  onApply,
  onRate,
  onRemoveRating,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div className="w-full max-w-xl max-h-[90vh] surface-card border border-border rounded-3xl shadow-2xl p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div
            className={`w-12 h-12 rounded-2xl ${iconBgMap[template.color] || "bg-orange-500/15 text-orange-500"} flex items-center justify-center`}
          >
            <BookOpen className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-5 scrollbar-hidden">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {template.name}
            </h2>
            {template.description && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                {template.description}
              </p>
            )}
          </div>

          <div className="bg-muted/60 border border-border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              {template.rating != null ? (
                <span className="font-bold text-foreground">
                  {template.rating}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({template.ratingCount}{" "}
                    {template.ratingCount === 1 ? "rating" : "ratings"})
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">No ratings yet</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {template.myRating != null ? "Your rating" : "Rate this"}
              </span>
              <StarRatingInput
                value={template.myRating}
                onRate={onRate}
                onRemove={onRemoveRating}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Questions", value: template.questions },
              { label: "Duration", value: template.duration },
              { label: "Difficulty", value: template.difficulty },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-muted/60 border border-border rounded-xl p-3 text-center"
              >
                <div className="text-sm font-bold text-foreground">
                  {s.value}
                </div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Sections
            </div>
            <div className="space-y-2.5">
              {template.sections.map((section, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs sm:text-sm"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-foreground font-medium">
                        {section.name}
                      </span>
                      {section.questionCount != null && (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                          {section.questionCount} Qs
                        </span>
                      )}
                    </div>
                    {section.topics && section.topics.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {section.topics.join(" · ")}
                      </p>
                    )}
                    {(section.marksPerCorrect != null ||
                      section.negativeMarksPerWrong != null) && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                        +{section.marksPerCorrect ?? "–"} / -
                        {section.negativeMarksPerWrong ?? "–"} per question
                      </p>
                    )}
                    {section.markingGroups &&
                      section.markingGroups.length > 0 && (
                        <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                          {section.markingGroups.map((group, gi) => (
                            <li key={group.id || gi}>
                              · {formatMarkingGroupSummary(group, section)}
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border mt-4 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border bg-card text-foreground font-semibold rounded-md hover:bg-muted text-xs sm:text-sm transition-all"
          >
            Close
          </button>
          <button
            onClick={onApply}
            className="flex-1 py-2.5 bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/30 hover:bg-orange-500/20 text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4 text-orange-500" /> Apply Template
          </button>
        </div>
      </div>
    </div>
  );
}
