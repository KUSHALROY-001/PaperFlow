const MIN_GENERATED_QUESTIONS = 5;
const MAX_GENERATED_QUESTIONS = 200;
const DIFFICULTY_OPTIONS = ["Variable", "Easy", "Medium", "Hard"];

export default function CreateMockTestGeneratePanel({
  uid,
  isLoadingSources,
  availableSources,
  selectedSourceIds,
  toggleSource,
  targetQuestionCount,
  setTargetQuestionCount,
  difficultyHint,
  setDifficultyHint,
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 block text-sm font-semibold text-foreground">
          Generate from which mock test(s)? *
        </p>
        <p className="mb-2 text-xs text-muted-foreground">
          The AI only sees these tests' topic breakdown and marking scheme —
          never the actual questions — so it writes a brand-new test with
          the same shape, not copies.
        </p>
        <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-2xl border border-border bg-muted/30 p-2">
          {isLoadingSources && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              Loading mock tests…
            </p>
          )}
          {!isLoadingSources && availableSources.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No mock tests with questions yet to generate from.
            </p>
          )}
          {availableSources.map((test) => (
            <label
              key={test.id}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-all ${
                selectedSourceIds.includes(test.id)
                  ? "border-orange-500/50 bg-orange-500/10"
                  : "border-transparent hover:bg-muted"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedSourceIds.includes(test.id)}
                onChange={() => toggleSource(test.id)}
                className="h-4 w-4 shrink-0 rounded border-border accent-orange-500"
              />
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {test.name}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {test.total_questions} question(s)
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`${uid}-question-count`}
            className="mb-2 block text-sm font-semibold text-foreground"
          >
            Question Count
          </label>
          <input
            id={`${uid}-question-count`}
            type="number"
            min={MIN_GENERATED_QUESTIONS}
            max={MAX_GENERATED_QUESTIONS}
            value={targetQuestionCount}
            onChange={(event) => setTargetQuestionCount(event.target.value)}
            className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {MIN_GENERATED_QUESTIONS}–{MAX_GENERATED_QUESTIONS}
          </p>
        </div>
        <div>
          <label
            htmlFor={`${uid}-difficulty`}
            className="mb-2 block text-sm font-semibold text-foreground"
          >
            Difficulty
          </label>
          <select
            id={`${uid}-difficulty`}
            value={difficultyHint}
            onChange={(event) => setDifficultyHint(event.target.value)}
            className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
          >
            {DIFFICULTY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
