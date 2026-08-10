import { Users, Loader2 } from "lucide-react";
import SubmissionCard from "./SubmissionCard";

export default function SubmissionsTab({
  submissions,
  isLoading,
  onDeleteSubmission,
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading submissions…
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="surface-card rounded-2xl border border-border p-10 text-center">
        <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-bold text-foreground mb-1">
          No submissions yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Once someone takes this test - whether a workspace member or
          someone using a shared link - their attempt and score will show
          up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <SubmissionCard
          key={submission.id}
          submission={submission}
          onDeleteSubmission={onDeleteSubmission}
        />
      ))}
    </div>
  );
}
