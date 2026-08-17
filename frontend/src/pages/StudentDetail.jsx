import { Link } from "react-router-dom";
import { ChevronLeft, Mail, FileCheck2, TrendingUp, Clock } from "lucide-react";
import { useStudentDetail } from "@/hooks/useStudentDetail";
import { avatarColorFor, initialsFor } from "@/utils/teamHelpers";
import { formatDate } from "@/lib/date";
import TopicAccuracyList from "../components/students/TopicAccuracyList";
import StudentAttemptRow from "../components/students/StudentAttemptRow";

export default function StudentDetail() {
  const { student, isLoading, error } = useStudentDetail();

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-5xl mx-auto space-y-6">
      <Link
        to="/students"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-muted-foreground hover:text-orange-500 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Students
      </Link>

      {isLoading && (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          Loading student...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
          {error.message || "Could not load this student"}
        </div>
      )}

      {student && (
        <>
          {/* Header */}
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl ${avatarColorFor(student.email)} flex items-center justify-center text-white font-bold text-lg shrink-0`}
            >
              {initialsFor(student.name || student.email)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate">
                {student.name || "Unnamed"}
              </h1>
              <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{student.email}</span>
              </div>
            </div>
          </div>

          {/* Stats row - same card pattern as TeamStatsRow.jsx */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Tests Taken",
                value: student.attemptsTaken,
                icon: FileCheck2,
                color:
                  "bg-orange-500/15 text-orange-500 border border-orange-500/20",
              },
              {
                label: "Average Score",
                value: student.averageScore,
                icon: TrendingUp,
                color:
                  "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20",
              },
              {
                label: "Last Active",
                value: formatDate(student.lastActive),
                icon: Clock,
                color:
                  "bg-amber-500/15 text-amber-500 border border-amber-500/20",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="surface-card rounded-2xl p-4 border border-border flex items-center gap-3"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center`}
                >
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-foreground tracking-tight">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Per-topic accuracy */}
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3">
              Topic Accuracy
            </h2>
            <TopicAccuracyList topicAccuracy={student.topicAccuracy} />
          </div>

          {/* Attempt history */}
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3">
              Attempt History
            </h2>
            <div className="space-y-3">
              {student.attempts.map((attempt) => (
                <StudentAttemptRow key={attempt.id} attempt={attempt} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
