import { memo } from "react";
import { Link } from "react-router-dom";
import { Mail, FileCheck2, TrendingUp, Clock, UserMinus } from "lucide-react";
import { formatDate } from "@/lib/date";
import UserAvatar from "@/components/shared/UserAvatar";

function StudentRow({
  student,
  cohorts,
  activeCohortId,
  onAddToCohort,
  onRemoveFromCohort,
}) {
  return (
    <div className="px-3.5 sm:px-6 py-3.5 sm:py-4 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <Link
        to={`/students/${encodeURIComponent(student.email)}`}
        className="flex items-center gap-3 min-w-0 flex-1"
      >
        <UserAvatar
          src={student.avatarUrl}
          name={student.name || student.email}
          seed={student.email}
          rounded="3xl"
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-foreground truncate">
            {student.name || "Unnamed"}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{student.email}</span>
          </div>
        </div>
      </Link>

      {/* Meta Info Section */}
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
        {/* Mobile Metadata */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium sm:hidden">
          <span className="flex items-center gap-1">
            <FileCheck2 className="w-3 h-3 text-orange-500" />
            {student.attemptsTaken}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-orange-500" />
            {student.averageScore ?? "-"}
          </span>
        </div>

        {/* Desktop Metadata */}
        <div className="text-xs text-muted-foreground hidden sm:block font-medium shrink-0">
          {student.attemptsTaken}{" "}
          {student.attemptsTaken === 1 ? "test" : "tests"}
        </div>
        <div className="text-xs text-muted-foreground hidden sm:block font-medium shrink-0">
          Avg score {student.averageScore ?? "-"}
        </div>
        <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1 font-medium shrink-0">
          <Clock className="w-3.5 h-3.5" />
          {formatDate(student.lastActive)}
        </div>

        {/* Cohort action - lives outside the Link above, deliberately: a
            <select>/<button> nested inside an <a> is invalid HTML and
            unreliable to click in some browsers. Two different actions
            depending on context: viewing a specific cohort shows
            "Remove"; viewing All Students shows an "Add to..." picker. */}
        {activeCohortId ? (
          <button
            onClick={() => onRemoveFromCohort(activeCohortId, student.email)}
            title="Remove from this cohort"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-500 border border-red-500/20 hover:bg-red-500/10 transition-all shrink-0"
          >
            <UserMinus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        ) : (
          cohorts.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value)
                  onAddToCohort(e.target.value, student.email);
              }}
              className="px-2 py-1.5 rounded-md text-xs font-bold border border-border bg-card text-muted-foreground hover:border-orange-500/30 transition-all shrink-0 max-w-30 sm:max-w-none"
            >
              <option value="">+ Add to cohort</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </option>
              ))}
            </select>
          )
        )}
      </div>
    </div>
  );
}

export default memo(StudentRow);
