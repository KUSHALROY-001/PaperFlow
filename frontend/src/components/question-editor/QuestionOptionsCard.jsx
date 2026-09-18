import { FileCode, Plus } from "lucide-react";
import QuestionOptionRow from "./QuestionOptionRow";

export default function QuestionOptionsCard({
  options = [],
  correctOptionIndexes = [],
  questionType = "single",
  questionId,
  mockTestId,
  diagramAssets,
  areOptionsRaw,
  setAreOptionsRaw,
  handleQuestionTypeChange,
  setCorrectOption,
  removeOption,
  addOption,
  updateOption,
  handleOptionAction,
  openOptionMenu,
  setOpenOptionMenu,
  optionMenuRefs,
  optionEditorRefs,
  isViewer,
  acceptedAnswers = [],
  gradingRubric = [],
  expectedAnswer = "",
  answerWordLimit,
  numericAnswer,
  numericTolerance,
  updateSelected,
}) {
  const isMcq = questionType === "single" || questionType === "multi";
  return (
    <div className="surface-card rounded-2xl p-3 sm:p-6 border border-border">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <span className="text-xs sm:text-sm font-bold text-foreground">
          Answer Options
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isViewer}
            aria-pressed={areOptionsRaw}
            onClick={() => setAreOptionsRaw((raw) => !raw)}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors ${
              areOptionsRaw
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
            } ${isViewer ? "cursor-not-allowed opacity-50" : ""}`}
            title="Show raw option text and markdown"
          >
            <FileCode className="w-3 h-3" /> Raw
          </button>
          <select
            disabled={isViewer}
            value={questionType}
            onChange={(event) => handleQuestionTypeChange(event.target.value)}
            className={`w-full sm:w-36 rounded-md border border-border bg-card text-foreground px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
              isViewer ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <option value="single">Single</option>
            <option value="multi">Multi</option>
            <option value="fill_blank">Fill in the blank</option>
            <option value="short_answer">Short answer</option>
            <option value="long_answer">Long answer</option>
            <option value="numerical">Numerical</option>
          </select>
        </div>
      </div>
      {isMcq && <div className="space-y-2">
        {options.map((opt, i) => {
          const isCorrect = correctOptionIndexes.includes(i);
          return (
            <QuestionOptionRow
              key={i}
              index={i}
              option={opt}
              isCorrect={isCorrect}
              totalOptions={options.length}
              questionId={questionId}
              mockTestId={mockTestId}
              diagramAssets={diagramAssets}
              areOptionsRaw={areOptionsRaw}
              isOpenMenu={openOptionMenu === i}
              onToggleMenu={() =>
                setOpenOptionMenu((open) => (open === i ? null : i))
              }
              onSetCorrect={setCorrectOption}
              onRemove={removeOption}
              onUpdate={updateOption}
              onOptionAction={handleOptionAction}
              optionMenuRefCallback={(element) => {
                optionMenuRefs.current[i] = element;
              }}
              optionEditorRefCallback={(instance) => {
                optionEditorRefs.current[i] = instance;
              }}
              isViewer={isViewer}
            />
          );
        })}
      </div>}
      {isMcq && <button
        type="button"
        disabled={isViewer || options.length >= 6}
        onClick={() => !isViewer && addOption()}
        className={`mt-3 flex items-center gap-1.5 text-xs font-bold transition-all ${
          isViewer
            ? "text-muted-foreground/40 cursor-not-allowed opacity-50"
            : "text-orange-500 hover:underline"
        }`}
      >
        <Plus className="w-3.5 h-3.5" /> Add Option
      </button>}
      {questionType === "fill_blank" && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-muted-foreground">Accepted answers (one line per blank; alternatives separated by |)</label>
          <textarea
            disabled={isViewer}
            value={acceptedAnswers.map((answers) => answers.join(" | ")).join("\n")}
            onChange={(event) => updateSelected("acceptedAnswers", event.target.value.split("\n").map((line) => line.split("|").map((answer) => answer.trim()).filter(Boolean)).filter((answers) => answers.length))}
            rows={3}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-orange-500 disabled:opacity-60"
          />
        </div>
      )}
      {(questionType === "short_answer" || questionType === "long_answer") && (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-muted-foreground">Model answer</label>
          <textarea disabled={isViewer} value={expectedAnswer} onChange={(event) => updateSelected("expectedAnswer", event.target.value)} rows={3} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-orange-500 disabled:opacity-60" />
          <label className="block text-xs font-semibold text-muted-foreground">Rubric points (one per line: point | weight)</label>
          <textarea disabled={isViewer} value={gradingRubric.map((item) => `${item.point} | ${item.weight}`).join("\n")} onChange={(event) => updateSelected("gradingRubric", event.target.value.split("\n").map((line) => { const [point, weight] = line.split("|"); return { point: point?.trim(), weight: Number(weight) || 1 }; }).filter((item) => item.point))} rows={4} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-orange-500 disabled:opacity-60" />
          <input disabled={isViewer} type="number" min="1" value={answerWordLimit ?? ""} placeholder="Optional word limit" onChange={(event) => updateSelected("answerWordLimit", event.target.value ? Number(event.target.value) : null)} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-orange-500 disabled:opacity-60" />
        </div>
      )}
      {questionType === "numerical" && (
        <div className="grid grid-cols-2 gap-3">
          <input disabled={isViewer} type="number" step="any" value={numericAnswer ?? ""} placeholder="Correct answer" onChange={(event) => updateSelected("numericAnswer", event.target.value === "" ? null : Number(event.target.value))} className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-orange-500 disabled:opacity-60" />
          <input disabled={isViewer} type="number" min="0" step="any" value={numericTolerance ?? ""} placeholder="Tolerance" onChange={(event) => updateSelected("numericTolerance", event.target.value === "" ? null : Number(event.target.value))} className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-orange-500 disabled:opacity-60" />
        </div>
      )}
    </div>
  );
}
