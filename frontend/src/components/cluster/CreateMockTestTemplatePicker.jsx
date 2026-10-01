import { Clock3, FileText, Search, Target, X } from "lucide-react";
import { formatDuration } from "@/utils/templateHelpers";

export default function CreateMockTestTemplatePicker({
  templates = [],
  selectedTemplateId,
  onSelect,
  search,
  onSearchChange,
  isLoading = false,
}) {
  const normalizedSearch = search.trim().toLowerCase();
  const visibleTemplates = templates.filter((template) => {
    const haystack = [template.name, template.description, ...(template.tags || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });
  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  );

  return (
    <section aria-labelledby="mock-template-label" className="space-y-2.5">
      <div>
        <h3 id="mock-template-label" className="text-sm font-semibold text-foreground">
          Template <span className="font-normal text-muted-foreground">(optional)</span>
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Apply a saved exam pattern before configuring the test.
        </p>
      </div>

      {selectedTemplate ? (
        <div className="flex min-h-20 items-start gap-2 rounded-lg border border-orange-500 bg-orange-500/10 p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-500">
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {selectedTemplate.name}
            </span>
            <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" />{selectedTemplate.questionCount ?? "—"} Q</span>
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatDuration(selectedTemplate.durationMinutes)}</span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-red-500"
            aria-label={`Remove ${selectedTemplate.name} template`}
            title="Remove template"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search templates..."
              className="w-full rounded-md border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-all focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/30"
            />
          </div>

          <div className="rounded-lg border border-orange-500 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-foreground">
            No template
          </div>

          <div className="max-h-[15.5rem] space-y-2 overflow-y-auto rounded-xl border border-border bg-muted/20 p-2 overscroll-contain">
        {isLoading && (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            Loading templates...
          </p>
        )}
        {!isLoading && visibleTemplates.length === 0 && (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            No templates match your search.
          </p>
        )}
        {visibleTemplates.map((template) => {
          const selected = template.id === selectedTemplateId;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              aria-pressed={selected}
          className={`min-h-28 w-full rounded-lg border p-3 text-left transition-all ${
                selected
                  ? "border-orange-500 bg-orange-500/10 shadow-sm"
                  : "border-border bg-card hover:border-orange-500/30 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                  <FileText className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {template.name}
                  </span>
                  {template.description && (
                    <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                      {template.description}
                    </span>
                  )}
                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" />{template.questionCount ?? "—"} Q</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatDuration(template.durationMinutes)}</span>
                  </span>
                </span>
              </div>
            </button>
          );
        })}
          </div>
        </>
      )}
    </section>
  );
}
