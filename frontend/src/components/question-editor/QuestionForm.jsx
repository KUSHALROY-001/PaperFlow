import { useState } from "react";
import { Crop, Plus, Sparkles, Trash2 } from "lucide-react";
import QuestionContent, { QuestionDiagram } from "../shared/QuestionContent";
import MathText from "../shared/MathText";
import { wrapBareLatex } from "@/utils/questionEditorHelpers";
import DiagramCropModal from "./DiagramCropModal";
import DiagramUploadControl from "./DiagramUploadControl";

export default function QuestionForm({
  selected,
  mockTestId,
  extractedTopics,
  isCustomTopic,
  setIsCustomTopic,
  updateSelected,
  updateOption,
  setCorrectOption,
  addOption,
  removeOption,
  isViewer,
}) {
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [diagramError, setDiagramError] = useState("");

  // Runs the text + every option through wrapBareLatex in one shot rather
  // than looping updateOption per index - updateOption reads
  // selected.options from its own closure, so calling it repeatedly in a
  // synchronous loop would have each call overwrite the previous one's
  // change instead of accumulating them. Building the full next array here
  // and setting it with a single updateSelected("options", ...) call
  // sidesteps that.
  const handleCleanUpMath = () => {
    updateSelected("text", wrapBareLatex(selected.text));
    updateSelected(
      "options",
      selected.options.map((option) => wrapBareLatex(option)),
    );
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto w-full space-y-6">
      <div className="surface-card rounded-2xl p-3 sm:p-6 border border-border">
        <div className="mb-4">
          <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
            Topic
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              disabled={isViewer}
              value={
                extractedTopics.includes(selected.topic) && !isCustomTopic
                  ? selected.topic
                  : "custom"
              }
              onChange={(e) => {
                if (isViewer) return;
                const val = e.target.value;
                if (val === "custom") {
                  setIsCustomTopic(true);
                } else {
                  setIsCustomTopic(false);
                  updateSelected("topic", val);
                }
              }}
              className={`flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                isViewer ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              {extractedTopics.length === 0 ? (
                <option value="General">General</option>
              ) : (
                extractedTopics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))
              )}
              <option value="custom">✍️ Custom Topic...</option>
            </select>

            {(!extractedTopics.includes(selected.topic) || isCustomTopic) && (
              <input
                type="text"
                disabled={isViewer}
                value={selected.topic}
                onChange={(e) =>
                  !isViewer && updateSelected("topic", e.target.value)
                }
                placeholder="Enter topic name..."
                className={`flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                  isViewer ? "cursor-not-allowed opacity-60" : ""
                }`}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-2">
          <label className="block text-xs sm:text-sm font-bold text-foreground">
            Question Text
          </label>
          <button
            type="button"
            disabled={isViewer}
            onClick={() => !isViewer && handleCleanUpMath()}
            title="Wrap bare pasted LaTeX (e.g. \frac{1}{2} with no $ signs around it) in math delimiters so it renders correctly - check the Live Preview below after"
            className={`flex items-center gap-1 text-[11px] font-bold transition-all shrink-0 ${
              isViewer
                ? "text-muted-foreground/40 cursor-not-allowed opacity-50"
                : "text-orange-500 hover:underline"
            }`}
          >
            <Sparkles className="w-3 h-3" /> Clean up pasted math
          </button>
        </div>
        <textarea
          disabled={isViewer}
          value={selected.text}
          onChange={(e) => !isViewer && updateSelected("text", e.target.value)}
          className={`w-full min-h-24 px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all text-xs sm:text-sm resize-vertical ${
            isViewer ? "cursor-not-allowed opacity-60" : ""
          }`}
        />
      </div>

      {selected.hasCode && (
        <div className="surface-card rounded-2xl p-3 sm:p-6 border border-border">
          <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
            Code Snippet
          </label>
          <p className="text-[11px] text-muted-foreground mb-2">
            Only the code goes here - "Question Text" above is just the prose
            lead-in shown before it (e.g. "What will be output of the following
            code snippet?"). Indentation and line breaks here are preserved
            exactly as typed.
          </p>
          <textarea
            disabled={isViewer}
            value={selected.codeSnippet || ""}
            onChange={(e) =>
              !isViewer && updateSelected("codeSnippet", e.target.value)
            }
            className={`w-full min-h-32 px-4 py-3 rounded-xl border border-border bg-card text-foreground font-mono whitespace-pre focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all text-xs sm:text-sm resize-vertical ${
              isViewer ? "cursor-not-allowed opacity-60" : ""
            }`}
          />
        </div>
      )}

      <div className="surface-card rounded-2xl p-3 sm:p-6 border border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <label className="text-xs sm:text-sm font-bold text-foreground">
            Answer Options
          </label>
          <select
            disabled={isViewer}
            value={selected.questionType}
            onChange={(event) => {
              if (isViewer) return;
              const nextType = event.target.value;
              updateSelected("questionType", nextType);
              if (nextType === "single") {
                updateSelected("correctOptionIndexes", [
                  selected.correctOptionIndexes[0] || 0,
                ]);
              }
            }}
            className={`w-full sm:w-36 rounded-xl border border-border bg-card text-foreground px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
              isViewer ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <option value="single">Single</option>
            <option value="multi">Multi</option>
          </select>
        </div>

        <div className="space-y-2">
          {selected.options.map((opt, i) => {
            const isCorrect = selected.correctOptionIndexes.includes(i);

            return (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-0 rounded-2xl sm:rounded-none bg-card/50 sm:bg-transparent border sm:border-0 border-border/60"
              >
                <div className="flex items-center justify-between sm:contents">
                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={() => !isViewer && setCorrectOption(i)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all font-bold text-xs border-2 ${
                      isViewer
                        ? "cursor-not-allowed opacity-50 border-border text-muted-foreground"
                        : isCorrect
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-border text-muted-foreground hover:border-orange-500/40"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </button>
                  <button
                    type="button"
                    disabled={isViewer || selected.options.length <= 2}
                    onClick={() => !isViewer && removeOption(i)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 sm:order-last ${
                      isViewer
                        ? "cursor-not-allowed text-muted-foreground/30"
                        : "hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                    }`}
                    title="Delete Option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  disabled={isViewer}
                  value={opt}
                  onChange={(e) => !isViewer && updateOption(i, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  rows={1}
                  ref={(el) => {
                    if (!el) return;
                    // Auto-grows to fit content instead of staying pinned
                    // at a fixed 2-row height with a manual resize handle.
                    // Without this, pressing Enter on a big option DID add
                    // a newline to the value - it just never became
                    // visible, since the box itself never got taller, so
                    // it looked like Enter was doing nothing. Runs on
                    // every render (a fresh inline ref like this makes
                    // React re-invoke it each time) so it also re-fits
                    // when switching between questions with different
                    // option lengths, not just while typing.
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                  className={`w-full sm:flex-1 px-4 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all resize-none overflow-hidden min-h-10 ${
                    isViewer
                      ? "cursor-not-allowed opacity-60 border-border bg-card text-foreground"
                      : isCorrect
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-bold"
                        : "border-border bg-card text-foreground"
                  }`}
                />
              </div>
            );
          })}
        </div>
        <button
          type="button"
          disabled={isViewer || selected.options.length >= 6}
          onClick={() => !isViewer && addOption()}
          className={`mt-3 flex items-center gap-1.5 text-xs font-bold transition-all ${
            isViewer
              ? "text-muted-foreground/40 cursor-not-allowed opacity-50"
              : "text-orange-500 hover:underline"
          }`}
        >
          <Plus className="w-3.5 h-3.5" /> Add Option
        </button>
      </div>

      <div className="surface-card rounded-2xl p-3 sm:p-6 border border-border bg-muted/30">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
          Live Preview
        </div>
        {selected.subtopic && (
          <div className="mb-2 inline-flex items-center rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
            {selected.subtopic}
          </div>
        )}
        <QuestionContent
          text={selected.text}
          passage={selected.passage}
          explanation={selected.explanation}
          hasCode={selected.hasCode}
          codeLanguage={selected.codeLanguage}
          codeSnippet={selected.codeSnippet}
          diagramUrl={selected.diagramUrl}
          placement={selected.placement}
          textClassName="text-sm font-bold text-foreground"
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
          {selected.diagramUrl && (
            <button
              type="button"
              disabled={isViewer || !selected.diagramOriginalUrl}
              onClick={() =>
                !isViewer &&
                selected.diagramOriginalUrl &&
                setIsCropModalOpen(true)
              }
              title={
                isViewer
                  ? "Editor role is required to edit the crop"
                  : !selected.diagramOriginalUrl
                    ? "This diagram has no original image saved - re-extract from the original PDF to get one"
                    : undefined
              }
              className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
                isViewer || !selected.diagramOriginalUrl
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
          placement={selected.placement}
          source={selected.source}
          isViewer={isViewer}
          onError={setDiagramError}
        />
        {diagramError && (
          <p className="mt-2 text-xs font-bold text-red-500">{diagramError}</p>
        )}
        <div className="grid grid-cols-1 gap-2 mt-4">
          {selected.options.map((opt, i) => (
            <div
              key={i}
              className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm whitespace-pre-wrap ${selected.correctOptionIndexes.includes(i) ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 font-bold" : "bg-card text-foreground border border-border"}`}
            >
              <span className="font-bold mr-2">
                {String.fromCharCode(65 + i)}.
              </span>
              <MathText text={opt} />
            </div>
          ))}
        </div>
        {selected.placement === "below_options" && (
          <div className="mt-4">
            <QuestionDiagram diagramUrl={selected.diagramUrl} />
          </div>
        )}
      </div>

      {isCropModalOpen && (
        <DiagramCropModal
          key={selected.id}
          questionId={selected.id}
          mockTestId={mockTestId}
          diagramOriginalUrl={selected.diagramOriginalUrl}
          hasManualCrop={selected.hasManualCrop}
          onClose={() => setIsCropModalOpen(false)}
        />
      )}
    </main>
  );
}
