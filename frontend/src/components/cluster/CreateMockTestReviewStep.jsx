export default function CreateMockTestReviewStep({
  mode,
  isBatchMode,
  selectedFiles,
  documentType,
  desiredQuestionCount,
  form,
  targetQuestionCount,
  difficultyHint,
  selectedSourceIds,
  availableSources,
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Content Source
        </p>
        {mode === "upload" && (
          <div className="space-y-1 text-sm text-foreground">
            <p className="font-semibold">
              {isBatchMode
                ? `${selectedFiles.length} separate mock tests`
                : selectedFiles.length > 1
                  ? `${selectedFiles.length} files combined into one test`
                  : selectedFiles[0]?.name || "No file selected"}
            </p>
            <p className="text-xs text-muted-foreground">
              {documentType === "notes"
                ? `Study notes${desiredQuestionCount ? ` — ~${desiredQuestionCount} questions` : " — auto-sized question count"}`
                : "Question paper — questions extracted as-is"}
            </p>
            {isBatchMode && (
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {selectedFiles.map((file, index) => {
                  const baseName = file.name.replace(/\.[^.]+$/, "");
                  const prefix = form.name.trim();
                  return (
                    <li key={index} className="truncate">
                      • {prefix ? `${prefix} - ${baseName}` : baseName}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
        {mode === "generate" && (
          <div className="space-y-1 text-sm text-foreground">
            <p className="font-semibold">
              {targetQuestionCount} questions ({difficultyHint} difficulty)
            </p>
            <p className="text-xs text-muted-foreground">
              From {selectedSourceIds.length} source
              {selectedSourceIds.length === 1 ? "" : "s"}:{" "}
              {availableSources
                .filter((test) => selectedSourceIds.includes(test.id))
                .map((test) => test.name)
                .join(", ")}
            </p>
          </div>
        )}
        {mode === "blank" && (
          <p className="text-sm text-foreground">
            Starting blank — no content attached yet.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Basics
        </p>
        <p className="text-sm text-foreground">
          {isBatchMode
            ? form.name.trim()
              ? `Prefix: ${form.name}`
              : "No name prefix"
            : form.name || "—"}
        </p>
        {form.description && (
          <p className="mt-1 text-xs text-muted-foreground">
            {form.description}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Exam Settings
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-foreground">
          <span className="text-muted-foreground">Duration</span>
          <span>{form.durationMinutes} min</span>
          <span className="text-muted-foreground">Marking</span>
          <span>
            +{form.marksPerCorrect} / −{form.negativeMarksPerWrong}
          </span>
          <span className="text-muted-foreground">
            Marks shown to students
          </span>
          <span>{form.showMarksToStudents ? "Yes" : "No"}</span>
          <span className="text-muted-foreground">Question order</span>
          <span className="capitalize">{form.questionOrder}</span>
        </div>
      </div>
    </div>
  );
}
