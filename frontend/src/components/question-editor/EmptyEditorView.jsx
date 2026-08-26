import { Plus } from "lucide-react";

export default function EmptyEditorView({ addQuestion, isViewer }) {
  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto w-full">
      <div className="surface-card rounded-md p-8 text-center border border-border">
        <p className="font-bold text-foreground">No questions yet</p>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Add a question to begin building this mock test manually.
        </p>
        <button
          onClick={() => !isViewer && addQuestion()}
          disabled={isViewer}
          className={`mt-4 inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs sm:text-sm font-bold shadow-xs ${
            isViewer
              ? "bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50"
              : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
          }`}
        >
          <Plus className="h-4 w-4" /> Add Question
        </button>
      </div>
    </main>
  );
}
