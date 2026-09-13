import { X, Sparkles, PenLine } from "lucide-react";

// First step of Create Template - offers "Build with AI" (Sparkles) or
// "Build Manually" (today's flow, unchanged). No form fields of its own;
// picking an option just tells Templates.jsx which modal to open next
// (GenerateTemplateModal or the existing blank CreateTemplateModal).
export default function CreateTemplateChoiceModal({
  onClose,
  onChooseAi,
  onChooseManual,
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
      <div className="w-full max-w-lg surface-card border border-border rounded-3xl shadow-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Create Template
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Start from an AI-generated draft or build it field by field.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onChooseAi}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 dark:bg-orange-500/15 text-left hover:bg-orange-500/20 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-500 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                Build with AI
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Just tell us the exam name — we'll draft the rest.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onChooseManual}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl border border-border bg-card text-left hover:bg-muted transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
              <PenLine className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                Build Manually
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Start from a blank template and fill in every field yourself.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
