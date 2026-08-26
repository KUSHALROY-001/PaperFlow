import { FileCode, Plus } from "lucide-react";
import QuestionOptionRow from "./QuestionOptionRow";

export default function QuestionOptionsCard({
  options = [],
  correctOptionIndexes = [],
  questionType = "single",
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
}) {
  return (
    <div className="surface-card rounded-2xl p-3 sm:p-6 border border-border">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <label className="text-xs sm:text-sm font-bold text-foreground">
          Answer Options
        </label>
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
          </select>
        </div>
      </div>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const isCorrect = correctOptionIndexes.includes(i);
          return (
            <QuestionOptionRow
              key={i}
              index={i}
              option={opt}
              isCorrect={isCorrect}
              totalOptions={options.length}
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
      </div>
      <button
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
      </button>
    </div>
  );
}
