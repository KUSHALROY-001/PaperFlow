import { useState } from "react";
import { Search, GraduationCap, TrendingUp } from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { useCohorts } from "@/hooks/useCohorts";
import { useWeakTopics } from "@/hooks/useWeakTopics";
import StudentsTable from "../components/students/StudentsTable";
import CohortSelector from "../components/students/CohortSelector";
import NewCohortModal from "../components/students/NewCohortModal";
import WeakTopicsPanel from "../components/students/WeakTopicsPanel";
import StudentsIntroCard from "../components/students/StudentsIntroCard";

export default function Students() {
  const {
    search,
    setSearch,
    cohortId,
    setCohortId,
    students,
    isLoading,
    error,
  } = useStudents();
  const {
    cohorts,
    error: cohortError,
    clearError: clearCohortError,
    createCohort,
    isCreating,
    addMember,
    removeMember,
  } = useCohorts();
  const [showNewCohort, setShowNewCohort] = useState(false);
  const { weakTopics, isLoading: weakTopicsLoading } = useWeakTopics(cohortId);

  const activeCohort = cohorts.find((c) => c.id === cohortId) || null;

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-5xl mx-auto space-y-6">
      <StudentsIntroCard />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Students
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Everyone who has taken one of your mock tests via a shared link.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-bold shrink-0">
          <GraduationCap className="w-4 h-4" />
          {students.length} {students.length === 1 ? "student" : "students"}
        </div>
      </div>

      {(error || cohortError) && (
        <div className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500 flex items-center justify-between gap-3">
          <span>{error?.message || cohortError}</span>
          {cohortError && (
            <button onClick={clearCohortError} className="font-bold shrink-0">
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Cohorts */}
      <CohortSelector
        cohorts={cohorts}
        cohortId={cohortId}
        setCohortId={setCohortId}
        onNewCohort={() => setShowNewCohort(true)}
      />

      {/* Active cohort's aggregate average score - "cohort-level aggregate
          stats (average score per cohort, not just per student)" */}
      {activeCohort && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold w-fit">
          <TrendingUp className="w-4 h-4" />
          {activeCohort.name} average score:{" "}
          {activeCohort.averageScore ?? "No submitted attempts yet"}
        </div>
      )}

      {/* Weak topics - Phase 3 actionable surfacing */}
      <WeakTopicsPanel weakTopics={weakTopics} isLoading={weakTopicsLoading} />

      {/* Search */}
      <div className="relative max-w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all text-xs sm:text-sm"
        />
      </div>

      <StudentsTable
        students={students}
        isLoading={isLoading}
        cohorts={cohorts}
        activeCohortId={cohortId}
        onAddToCohort={(cId, email) => addMember({ cohortId: cId, email })}
        onRemoveFromCohort={(cId, email) =>
          removeMember({ cohortId: cId, email })
        }
      />

      {showNewCohort && (
        <NewCohortModal
          onClose={() => setShowNewCohort(false)}
          onCreate={createCohort}
          isCreating={isCreating}
        />
      )}
    </div>
  );
}
