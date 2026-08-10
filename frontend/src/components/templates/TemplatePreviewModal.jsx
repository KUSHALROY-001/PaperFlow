import { BookOpen, ChevronRight, Download } from "lucide-react";
import { iconBgMap } from "@/utils/templateHelpers";

// Promoted from inline JSX inside pages/Templates.jsx — no behavior changes.
export default function TemplatePreviewModal({ template, onClose, onApply }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md surface-card border border-border rounded-3xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-14 h-14 rounded-2xl ${iconBgMap[template.color] || "bg-orange-500/15 text-orange-500"} flex items-center justify-center mb-4 shrink-0`}
        >
          <BookOpen className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">{template.name}</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-4 leading-relaxed">
          {template.description}
        </p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Questions", value: template.questions },
            { label: "Duration", value: template.duration },
            { label: "Difficulty", value: template.difficulty },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-muted/60 border border-border rounded-xl p-3 text-center"
            >
              <div className="text-sm font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mb-5">
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
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border bg-card text-foreground font-semibold rounded-xl hover:bg-muted text-xs sm:text-sm transition-all"
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
