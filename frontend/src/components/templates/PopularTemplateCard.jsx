import { FileText, Star } from "lucide-react";
import { iconBgMap } from "@/utils/templateHelpers";

// Promoted from an inline .map() inside pages/Templates.jsx — no behavior changes.
export default function PopularTemplateCard({ template, onPreview }) {
  return (
    <div
      className="surface-card rounded-2xl p-4 border border-border hover:border-orange-500/30 transition-all cursor-pointer"
      onClick={() => onPreview(template)}
    >
      <div
        className={`w-10 h-10 rounded-xl ${iconBgMap[template.color] || "bg-orange-500/15 text-orange-500"} flex items-center justify-center mb-3 shrink-0`}
      >
        <FileText className="w-5 h-5" />
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
