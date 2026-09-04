import { Code2, FileCode, ImagePlus, MoreVertical, Sparkles } from "lucide-react";
import FormattedTextEditor from "../shared/FormattedTextEditor";
import RichTextToolbar from "./RichTextToolbar";
import { DiagramAssetsProvider } from "@/lib/diagramAssetsContext";

export default function QuestionExplanationCard({
  explanation,
  questionId,
  mockTestId,
  diagramAssets,
  updateSelected,
  isExplanationRaw,
  setIsExplanationRaw,
  isExplanationMenuOpen,
  setIsExplanationMenuOpen,
  explanationMenuRef,
  explanationRef,
  formattedExplanationRef,
  handleInsertMath,
  handleInsertImage,
  handleIndentExplanationCode,
  handleKeyDownTextarea,
  isViewer,
}) {
  return (
    <div className="surface-card rounded-2xl p-3 sm:p-6 border border-border">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="block text-xs sm:text-sm font-bold text-foreground">
            Explanation (Optional)
          </span>
          <button
            type="button"
            disabled={isViewer}
            aria-pressed={isExplanationRaw}
            onClick={() => setIsExplanationRaw((raw) => !raw)}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors ${
              isExplanationRaw
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
            } ${isViewer ? "cursor-not-allowed opacity-50" : ""}`}
            title="Show raw text and markdown"
          >
            <FileCode className="w-3 h-3" /> Raw
          </button>
        </div>

        {/* 3-dot Action Menu for Explanation */}
        <div className="relative" ref={explanationMenuRef}>
          <button
            type="button"
            disabled={isViewer}
            onClick={() => setIsExplanationMenuOpen((prev) => !prev)}
            className={`w-7 h-7 rounded-lg border border-border bg-card flex items-center justify-center transition-all ${
              isViewer
                ? "text-muted-foreground/30 cursor-not-allowed opacity-50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted hover:border-orange-500/40"
            }`}
            title="More actions"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {isExplanationMenuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-card border border-border rounded-xl shadow-lg p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                disabled={isViewer}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setIsExplanationMenuOpen(false);
                  handleInsertMath("explanation");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted hover:text-orange-500 rounded-lg transition-colors text-left"
              >
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                Insert math
              </button>
              <button
                type="button"
                disabled={isViewer}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setIsExplanationMenuOpen(false);
                  handleInsertImage("explanation");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted hover:text-orange-500 rounded-lg transition-colors text-left"
              >
                <ImagePlus className="w-3.5 h-3.5 text-orange-500" />
                Insert image
              </button>
              <button
                type="button"
                disabled={isViewer}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setIsExplanationMenuOpen(false);
                  handleIndentExplanationCode();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted hover:text-orange-500 rounded-lg transition-colors text-left"
              >
                <Code2 className="w-3.5 h-3.5 text-orange-500" />
                Indent code
              </button>
            </div>
          )}
        </div>
      </div>

      {!isExplanationRaw ? (
        <DiagramAssetsProvider assets={diagramAssets}>
          <FormattedTextEditor
            ref={formattedExplanationRef}
            value={explanation || ""}
            onChange={(val) => updateSelected("explanation", val)}
            disabled={isViewer}
            placeholder="Add explanation for the correct answer..."
            questionId={questionId}
            mockTestId={mockTestId}
          />
        </DiagramAssetsProvider>
      ) : (
        <>
          <div className="mb-2">
            <RichTextToolbar
              textareaRef={explanationRef}
              disabled={isViewer}
              onChange={(value) => updateSelected("explanation", value)}
            />
          </div>
          <textarea
            ref={explanationRef}
            disabled={isViewer}
            value={explanation || ""}
            onChange={(e) =>
              !isViewer && updateSelected("explanation", e.target.value)
            }
            onKeyDown={(e) => handleKeyDownTextarea(e, "explanation")}
            placeholder="Add explanation for the correct answer..."
            className={`w-full min-h-20 px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all text-xs sm:text-sm resize-vertical ${
              isViewer ? "cursor-not-allowed opacity-60" : ""
            }`}
          />
        </>
      )}
    </div>
  );
}
