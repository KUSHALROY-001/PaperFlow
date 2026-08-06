import { BookOpen, Download, Eye, Star, Target, Zap } from "lucide-react";
import { colorMap, iconBgMap } from "@/utils/templateHelpers";
import { useAuth } from "@/lib/AuthContext";

export default function TemplateCard({ template, onPreview, onApply }) {
  const { isViewer } = useAuth();

  return (
    <div className="surface-card rounded-2xl p-5 border border-border hover:border-orange-500/30 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div
          className={`w-12 h-12 rounded-2xl ${iconBgMap[template.color] || "bg-orange-500/15 text-orange-500"} flex items-center justify-center shrink-0`}
        >
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-foreground text-sm sm:text-base">
                {template.name}
              </h3>
              <span
                className={`inline-block text-[11px] px-2.5 py-0.5 mt-1 rounded-lg font-semibold ${colorMap[template.color] || colorMap.orange}`}
              >
                {template.category}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-foreground">
                {template.rating ?? "—"}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {template.description}
          </p>
          <div className="flex items-center gap-3 mt-3 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-orange-500" />{" "}
              {template.questions} Qs
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-orange-500" />{" "}
              {template.duration}
            </span>
            <span
              className={`font-semibold ${template.difficulty === "Easy" ? "text-emerald-500" : template.difficulty === "Medium" ? "text-amber-500" : "text-red-500"}`}
            >
              {template.difficulty}
            </span>
          </div>
          <div className="flex flex-col min-[420px]:flex-row gap-2 mt-4">
            <button
              onClick={() => onPreview(template)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold border border-border bg-card text-foreground rounded-xl hover:bg-muted hover:border-orange-500/40 transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-orange-500" /> Preview
            </button>
            <button
              disabled={isViewer}
              onClick={() => !isViewer && onApply(template)}
              title={
                isViewer ? "Editor role is required to apply templates" : undefined
              }
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                isViewer
                  ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50 border border-border"
                  : "bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/30 hover:bg-orange-500/20"
              }`}
            >
              <Download className="w-3.5 h-3.5 text-orange-500" /> Apply
              Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
