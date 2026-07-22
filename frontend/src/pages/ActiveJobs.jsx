import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle, Clock, Zap } from "lucide-react";
import { api } from "@/lib/api";

function formatTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

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
  const running = jobs.filter((job) => ["queued", "running"].includes(job.status));
  const completed = jobs.filter((job) => job.status === "completed").slice(0, 8);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Active Jobs</h1>
        <p className="text-muted-foreground mt-1">
          Monitor mock-test processing jobs across all clusters
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-medium text-red-700">
          {error.message}
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-violet-500 pulse-violet" />
          <h2 className="text-lg font-bold text-foreground">
            Running Now ({running.length})
          </h2>
        </div>
        {isLoading ? (
          <div className="card-lavender rounded-2xl p-8 text-sm text-muted-foreground">
            Loading jobs...
          </div>
        ) : running.length === 0 ? (
          <div className="card-lavender rounded-2xl p-12 text-center">
            <Zap className="w-10 h-10 text-violet-300 mx-auto mb-3" />
            <p className="text-foreground font-semibold mb-1">No active jobs</p>
            <p className="text-sm text-muted-foreground">
              All mock-test pipelines are idle
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {running.map((job) => (
              <div key={job.id} className="card-lavender rounded-2xl p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                      <Zap className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">
                        {job.mock_test_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {job.cluster_name} / {job.status} / {job.current_stage || "Queued"}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/cluster/${job.cluster_id}/mocktest/${job.mock_test_id}`}
                    className="flex w-full sm:w-auto items-center justify-center gap-1.5 text-sm px-4 py-2 gradient-violet text-white font-semibold rounded-xl shadow-md shadow-violet-200 hover:opacity-90 transition-all"
                  >
                    View Job <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>{jobPercent(job)}% complete</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Started {formatTime(job.started_at || job.created_at)}
                  </span>
                </div>
                <div className="h-2.5 bg-violet-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full shimmer"
                    style={{ width: `${Math.max(jobPercent(job), 8)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">
          Recently Completed
        </h2>
        {completed.length === 0 ? (
          <div className="card-lavender rounded-2xl p-8 text-sm text-muted-foreground">
            No completed processing jobs yet.
          </div>
        ) : (
          <div className="space-y-3">
            {completed.map((job) => (
              <div
                key={job.id}
                className="card-lavender rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">
                    {job.mock_test_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {job.cluster_name} / completed / {formatTime(job.completed_at)}
                  </p>
                </div>
                <Link
                  to={`/cluster/${job.cluster_id}/mocktest/${job.mock_test_id}`}
                  className="flex w-full sm:w-auto items-center justify-center gap-1.5 text-sm px-3 py-2 bg-violet-100 text-violet-700 font-semibold rounded-xl hover:bg-violet-200 transition-colors"
                >
                  Open Mock <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
