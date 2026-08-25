import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle, Clock, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { formatClockTime } from "@/lib/date";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { SkeletonRowList } from "@/components/ui/skeleton-row";

function jobPercent(job) {
  if (job.status === "completed") return 100;
  return Number(job.progress_percent || 0);
}

export default function ActiveJobs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["processing-jobs"],
    queryFn: () => api.listProcessingJobs(),
    refetchInterval: 10000,
  });

  const jobs = data?.jobs || [];
  const running = jobs.filter((job) =>
    ["queued", "running"].includes(job.status),
  );
  const completed = jobs
    .filter((job) => job.status === "completed")
    .slice(0, 8);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Active Jobs
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1">
          Monitor mock-test processing jobs across all clusters
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm font-medium text-red-500">
          {error.message}
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
          <h2 className="text-lg font-extrabold text-foreground tracking-tight">
            Running Now ({running.length})
          </h2>
        </div>
        {isLoading ? (
          <div className="space-y-4">
            <SkeletonCard showIcon={true} lines={2} />
            <SkeletonCard showIcon={true} lines={2} />
          </div>
        ) : running.length === 0 ? (
          <div className="surface-card rounded-2xl p-12 border border-border text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500/60 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6" />
            </div>
            <p className="text-foreground font-bold text-base mb-1">
              No active jobs
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              All mock-test processing pipelines are currently idle
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {running.map((job) => (
              <div
                key={job.id}
                className="surface-card rounded-2xl p-6 border border-border hover:border-orange-500/30 transition-all"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 fill-orange-500/20" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate">
                        {job.mock_test_name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {job.cluster_name} /{" "}
                        <span className="capitalize">{job.status}</span> /{" "}
                        {job.current_stage || "Queued"}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/cluster/${job.cluster_id}/mocktest/${job.mock_test_id}`}
                    className="flex w-full sm:w-auto items-center justify-center gap-1.5 text-xs sm:text-sm px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-md shadow-xs transition-all shrink-0"
                  >
                    View Job <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="flex justify-between text-xs sm:text-sm font-semibold text-muted-foreground mb-2">
                  <span>{jobPercent(job)}% complete</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Started{" "}
                    {formatClockTime(job.started_at || job.created_at)}
                  </span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#ea580c] transition-all duration-500"
                    style={{ width: `${Math.max(jobPercent(job), 8)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-extrabold text-foreground tracking-tight mb-4">
          Recently Completed
        </h2>
        {isLoading ? (
          <SkeletonRowList count={3} showAvatar />
        ) : completed.length === 0 ? (
          <div className="surface-card rounded-2xl p-8 border border-border text-sm text-muted-foreground">
            No completed processing jobs yet.
          </div>
        ) : (
          <div className="space-y-3">
            {completed.map((job) => (
              <div
                key={job.id}
                className="surface-card rounded-2xl p-5 border border-border flex flex-col sm:flex-row sm:items-center gap-4 hover:border-orange-500/30 transition-all"
              >
                <div className="w-10 h-10 bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-sm sm:text-base truncate">
                    {job.mock_test_name}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {job.cluster_name} / Completed /{" "}
                    {formatClockTime(job.completed_at)}
                  </p>
                </div>
                <Link
                  to={`/cluster/${job.cluster_id}/mocktest/${job.mock_test_id}`}
                  className="flex w-full sm:w-auto items-center justify-center gap-1.5 text-xs sm:text-sm px-4 py-2 border border-border bg-card text-foreground font-semibold rounded-3xl hover:bg-muted hover:border-orange-500/40 transition-colors shrink-0"
                >
                  Open Mock{" "}
                  <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
