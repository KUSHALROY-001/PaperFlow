import { FileText, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Extracted from pages/Dashboard.jsx — no behavior changes.
export default function ActiveJobsPanel({ activeJobs, isLoading }) {
  return (
    <div>
      <h2 className="text-base sm:text-lg font-bold text-foreground mb-3">
        Active Mock Jobs
      </h2>
      <div className="surface-card rounded-2xl p-4 text-center border border-border flex flex-col items-center justify-center min-h-47.5 sm:p-6">
        {isLoading && (
          <div className="w-full space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="text-left p-3 rounded-xl bg-muted/40 border border-border space-y-2"
              >
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            ))}
          </div>
        )}
        {!isLoading && activeJobs.length === 0 && (
          <>
            <div className="w-14 h-14 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center relative mb-3">
              <FileText className="w-6 h-6 text-orange-500/80" />
              <Zap className="w-4 h-4 text-orange-500 absolute -bottom-0.5 -right-0.5 fill-orange-500" />
            </div>
            <p className="text-sm font-bold text-foreground">
              No mock tests processing
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You&apos;re all caught up! 🎉
            </p>
          </>
        )}
        {!isLoading && activeJobs.length > 0 && (
          <div className="w-full space-y-3">
            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="text-left p-3 rounded-xl bg-muted/40 border border-border"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  <span className="text-xs font-bold text-foreground truncate">
                    {job.mock_test_name}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {job.progress_percent || 0}% completed
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
