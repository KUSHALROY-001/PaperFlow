import { Crop } from "lucide-react";
import QuestionContent, { QuestionExplanation } from "../shared/QuestionContent";
import MathText from "../shared/MathText";
import DiagramUploadControl from "./DiagramUploadControl";
import { DiagramAssetsProvider } from "@/lib/diagramAssetsContext";
import MarksBadge from "@/components/shared/MarksBadge";

export default function QuestionPreviewCard({
  selected,
  mockTestId,
  diagramError,
  setDiagramError,
  onOpenCropModal,
  updateSelected,
  isViewer,
}) {
  if (!selected) return null;

  const handleUpdateText = (updater) => {
    if (!updateSelected) return;
    const nextText =
      typeof updater === "function" ? updater(selected.text) : updater;
    updateSelected("text", nextText);
  };

  const handleUpdateExplanation = (updater) => {
    if (!updateSelected) return;
    const nextExplanation =
      typeof updater === "function" ? updater(selected.explanation) : updater;
    updateSelected("explanation", nextExplanation);
  };

  // Passed to DiagramUploadControl: a brand-new default-slot upload has
  // no ![[img:default]] marker anywhere yet, so append one to the
  // question text - otherwise the image is stored but invisible (there's
  // no more top/middle/bottom fallback rendering it automatically).
  const handleInsertDefaultMarker = () => {
    if (!updateSelected) return;
    const trimmed = (selected.text || "").trimEnd();
    const nextText = trimmed
      ? `${trimmed}\n\n![[img:default]]`
      : "![[img:default]]";
    updateSelected("text", nextText);
  };

  return (
    <div className="space-y-6">
      <div className="surface-card rounded-2xl p-3 sm:p-6 border border-border bg-muted/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Live Preview
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <MarksBadge
            marksPerCorrect={selected.marksPerCorrect}
            negativeMarksPerWrong={selected.negativeMarksPerWrong}
            unsetLabel="Marks unset"
          />
        </div>
        {selected.subtopic && (
          <div className="mb-2 inline-flex items-center rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-xs text-sky-600 dark:text-sky-400">
            {selected.subtopic}
          </div>
        )}
        <DiagramAssetsProvider assets={selected.diagramAssets}>
          <QuestionContent
            text={selected.text}
            passage={selected.passage}
            explanation={selected.explanation}
            textClassName="text-sm text-foreground"
            editable={!isViewer}
            onUpdateText={handleUpdateText}
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
            {selected.diagramUrl && (
              <button
                type="button"
                disabled={isViewer}
                onClick={() => !isViewer && onOpenCropModal()}
                title={
                  isViewer
                    ? "Editor role is required to edit the crop"
                    : undefined
                }
                className={`flex items-center gap-1.5 text-xs transition-all ${
                  isViewer
                    ? "text-muted-foreground/40 cursor-not-allowed opacity-50"
                    : "text-orange-500 hover:underline"
                }`}
              >
                <Crop className="w-3.5 h-3.5" /> Edit Crop
              </button>
            )}
          </div>
          <DiagramUploadControl
            questionId={selected.id}
            mockTestId={mockTestId}
            diagramUrl={selected.diagramUrl}
            source={selected.source}
            sourcePage={selected.sourcePage}
            isViewer={isViewer}
            onError={setDiagramError}
            onInsertDefaultMarker={handleInsertDefaultMarker}
          />
          {diagramError && (
            <p className="mt-2 text-xs text-red-500">{diagramError}</p>
          )}
          <div className="grid grid-cols-1 gap-2 mt-4">
            {(selected.options || []).map((opt, i) => (
              <div
                key={i}
                className={`px-3 py-2.5 rounded-md text-xs sm:text-sm whitespace-pre-wrap wrap-break-word ${
                  (selected.correctOptionIndexes || []).includes(i)
                    ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                    : "bg-card text-foreground border border-border"
                }`}
              >
                <span className="mr-2">{String.fromCodePoint(65 + i)}.</span>
                <MathText text={opt} />
              </div>
            ))}
          </div>
          <QuestionExplanation
            explanation={selected.explanation}
            editable={!isViewer}
            onUpdateExplanation={handleUpdateExplanation}
          />
        </DiagramAssetsProvider>
      </div>
    </div>
  );
}
