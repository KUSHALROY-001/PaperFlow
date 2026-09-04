import { FileText, Sparkles, Star } from "lucide-react";
import { iconBgMap } from "@/utils/templateHelpers";

// Promoted from an inline .map() inside pages/Templates.jsx — no behavior changes.
export default function PopularTemplateCard({ template, onPreview }) {
  return (
    <div
      className="surface-card rounded-2xl p-4 border border-border hover:border-orange-500/30 transition-all cursor-pointer"
      onClick={() => onPreview(template)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPreview(template);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className={`w-10 h-10 rounded-xl ${iconBgMap[template.color] || "bg-orange-500/15 text-orange-500"} flex items-center justify-center shrink-0`}
        >
          <FileText className="w-5 h-5" />
        </div>
        {/* Only shows up here if a self-created template is ever marked
            isPopular by hand elsewhere - CreateTemplateModal never sets it,
            so today this section is exclusively official templates. Added
            anyway so this card doesn't silently mislabel one as official
            if that ever changes, matching the badge TemplateCard already
            shows unconditionally on isOwn. */}
        {template.isOwn && (
          <span
            title="Created by your workspace"
            className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0"
          >
            <Sparkles className="w-2.5 h-2.5" /> Yours
          </span>
        )}
      </div>
      <div className="font-bold text-sm text-foreground truncate">
        {template.name}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {template.questions} questions
      </div>
      <div className="flex items-center gap-1 mt-2">
        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
        <span className="text-xs font-bold text-foreground">
          {template.rating ?? "—"}
        </span>
        <span className="text-xs text-muted-foreground">
          ({template.uses.toLocaleString()})
        </span>
      </div>
    </div>
  );
}
