export default function CreateMockTestSettingsStep({ uid, form, updateForm }) {
  return (
    <>
      <div>
        <label
          htmlFor={`${uid}-duration`}
          className="mb-2 block text-sm font-semibold text-foreground"
        >
          Duration Minutes
        </label>
        <input
          id={`${uid}-duration`}
          type="number"
          min="1"
          value={form.durationMinutes}
          onChange={(event) =>
            updateForm({ durationMinutes: event.target.value })
          }
          className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`${uid}-marks-per-correct`}
            className="mb-2 block text-sm font-semibold text-foreground"
          >
            Marks per correct
          </label>
          <input
            id={`${uid}-marks-per-correct`}
            type="number"
            min="0"
            step="any"
            value={form.marksPerCorrect}
            onChange={(event) =>
              updateForm({ marksPerCorrect: event.target.value })
            }
            className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
          />
        </div>
        <div>
          <label
            htmlFor={`${uid}-negative-marks`}
            className="mb-2 block text-sm font-semibold text-foreground"
          >
            −ve marks per wrong
          </label>
          <input
            id={`${uid}-negative-marks`}
            type="number"
            min="0"
            step="any"
            value={form.negativeMarksPerWrong}
            onChange={(event) =>
              updateForm({ negativeMarksPerWrong: event.target.value })
            }
            className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
          />
        </div>
      </div>

      <label
        htmlFor={`${uid}-show-marks`}
        className="flex items-start gap-3 rounded-md border border-border bg-muted/30 px-3 py-3 cursor-pointer"
      >
        <input
          id={`${uid}-show-marks`}
          type="checkbox"
          className="mt-0.5 rounded border-border"
          checked={form.showMarksToStudents}
          onChange={(event) =>
            updateForm({ showMarksToStudents: event.target.checked })
          }
        />
        <span>
          <span className="block text-sm font-semibold text-foreground">
            Show marking to students
          </span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            Off by default. When on, students see +/− marks on each
            question during the attempt.
          </span>
        </span>
      </label>

      <div>
        <p className="mb-2 block text-sm font-semibold text-foreground">
          Question order
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateForm({ questionOrder: "sequential" })}
            className={`rounded-md border-2 px-3 py-2.5 text-left transition-all ${
              form.questionOrder === "sequential"
                ? "border-orange-500/60 bg-orange-500/10"
                : "border-border bg-muted/40 hover:border-orange-500/30"
            }`}
          >
            <span className="block text-sm font-semibold text-foreground">
              Sequential
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Same order as the uploaded paper
            </span>
          </button>
          <button
            type="button"
            onClick={() => updateForm({ questionOrder: "random" })}
            className={`rounded-md border-2 px-3 py-2.5 text-left transition-all ${
              form.questionOrder === "random"
                ? "border-orange-500/60 bg-orange-500/10"
                : "border-border bg-muted/40 hover:border-orange-500/30"
            }`}
          >
            <span className="block text-sm font-semibold text-foreground">
              Random
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Shuffled per student, kept for their whole attempt
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
