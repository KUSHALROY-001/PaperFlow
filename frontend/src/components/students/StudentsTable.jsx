import StudentRow from "./StudentRow";

export default function StudentsTable({
  students,
  isLoading,
  cohorts,
  activeCohortId,
  onAddToCohort,
  onRemoveFromCohort,
}) {
  return (
    <div className="surface-card rounded-2xl border border-border">
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border flex items-center justify-between sm:justify-start rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">Roster</span>
          <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">
            {students.length}
          </span>
        </div>
      </div>
      {isLoading && (
        <div className="px-6 py-6 text-xs text-muted-foreground">
          Loading students...
        </div>
      )}
      {!isLoading && students.length === 0 && (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-bold text-foreground mb-1">
            No students yet
          </p>
          <p className="text-xs text-muted-foreground">
            Students show up here once someone takes a mock test through a
            shared link and enters their name and email.
          </p>
        </div>
      )}
      <div className="divide-y divide-border [&>*:last-child]:rounded-b-2xl">
        {students.map((student) => (
          <StudentRow
            key={student.email}
            student={student}
            cohorts={cohorts}
            activeCohortId={activeCohortId}
            onAddToCohort={onAddToCohort}
            onRemoveFromCohort={onRemoveFromCohort}
          />
        ))}
      </div>
    </div>
  );
}
