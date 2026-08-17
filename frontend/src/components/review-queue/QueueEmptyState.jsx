import { PartyPopper } from "lucide-react";

export default function QueueEmptyState({ hasFilters }) {
  return (
    <div className="surface-card rounded-3xl border border-border p-10 sm:p-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto mb-4">
        <PartyPopper className="w-7 h-7" />
      </div>
      <h3 className="font-bold text-lg text-foreground mb-1">
        Queue's empty - nice work
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        {hasFilters
          ? "Nothing matches the current filters. Try widening them, or check back once more extractions come in."
          : "Every question across your clusters has been reviewed. New extractions will show up here automatically."}
      </p>
    </div>
  );
}
