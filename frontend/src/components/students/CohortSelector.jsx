import { Plus } from "lucide-react";

export default function CohortSelector({
  cohorts,
  cohortId,
  setCohortId,
  onNewCohort,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => setCohortId(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
          cohortId === null
            ? "bg-orange-500/15 border-orange-500/40 text-orange-500"
            : "border-border text-muted-foreground hover:border-orange-500/30"
        }`}
      >
        All Students
      </button>
      {cohorts.map((cohort) => (
        <button
          key={cohort.id}
          onClick={() => setCohortId(cohort.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
            cohortId === cohort.id
              ? "bg-orange-500/15 border-orange-500/40 text-orange-500"
              : "border-border text-muted-foreground hover:border-orange-500/30"
          }`}
        >
          {cohort.name}{" "}
          <span className="opacity-70">({cohort.memberCount})</span>
        </button>
      ))}
      <button
        onClick={onNewCohort}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-dashed border-border text-muted-foreground hover:border-orange-500/40 hover:text-orange-500 transition-all"
      >
        <Plus className="w-3.5 h-3.5" /> New Cohort
      </button>
    </div>
  );
}
