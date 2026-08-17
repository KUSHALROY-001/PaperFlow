import { Link } from "react-router-dom";
import { Plus, Save, CheckCircle, Sigma, ArrowLeft } from "lucide-react";

export default function EditorHeader({
  questionsCount,
  issueCount,
  addQuestion,
  handleSave,
  isSaving,
  saved,
  isViewer,
  onShowLatexReference,
  returnTo,
}) {
  return (
    <header className="min-h-14 bg-card/80 backdrop-blur-md border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center px-4 sm:px-6 py-3 sticky top-16 z-20">
      <div className="flex-1 flex items-center gap-3 min-w-0">
        {returnTo && (
          <Link
            to={returnTo}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Return to the Review Queue"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Review Queue
          </Link>
        )}
        <span className="text-sm font-bold text-foreground">
          {questionsCount} Questions
        </span>
        <span className="text-xs text-muted-foreground">
          {issueCount} with issues
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onShowLatexReference}
          className="inline-flex items-center gap-2 px-4 py-2 font-bold rounded-xl text-xs sm:text-sm transition-all border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Sigma className="w-4 h-4" /> Show LaTeX
        </button>
        <button
          onClick={() => !isViewer && addQuestion()}
          disabled={isViewer}
          title={
            isViewer ? "Editor role is required to add questions" : undefined
          }
          className={`hidden lg:inline-flex items-center gap-2 px-4 py-2 font-bold rounded-xl text-xs sm:text-sm transition-all ${
            isViewer
              ? "bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50"
              : "bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs"
          }`}
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>
        <button
          onClick={() => !isViewer && handleSave()}
          disabled={isSaving || questionsCount === 0 || isViewer}
          title={
            isViewer ? "Editor role is required to save questions" : undefined
          }
          className={`flex items-center gap-2 px-5 py-2 font-bold rounded-xl text-xs sm:text-sm transition-all ${
            isViewer
              ? "bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50"
              : saved
                ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                : "bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs"
          }`}
        >
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4" /> Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save All"}
            </>
          )}
        </button>
      </div>
    </header>
  );
}
