import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clock,
  FolderOpen,
  MoreVertical,
  Plus,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/date";

// Extracted from pages/Dashboard.jsx, with two fixes:
//
// 1. The footer used to show a hardcoded literal "2d ago" for every single
//    cluster, regardless of its actual updated_at. Now uses formatTimeAgo.
// 2. The mock-test-count badge used `cluster.mock_test_count || 1`, which
//    incorrectly showed "1 mocks" for a cluster with genuinely 0 mock
//    tests (since `0 || 1` evaluates to 1). Now uses `?? 0` so only a
//    missing value falls back, not a real zero.
export default function RecentClustersList({ clusters }) {
  return (
    <div className="lg:col-span-2 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          Recent Clusters
        </h2>
        <Link
          to="/clusters"
          className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {clusters.length === 0 ? (
          <div className="surface-card rounded-2xl border border-border p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
              <FolderOpen className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              It seems you don't have any cluster yet
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first cluster to start organizing mock tests and
              questions.
            </p>
            <Link
              to="/clusters"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#ea580c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#c2410c]"
            >
              <Plus className="h-4 w-4" /> Create Cluster
            </Link>
          </div>
        ) : (
          clusters.map((cluster) => (
            <div
              key={cluster.id}
              className="surface-card rounded-2xl p-4 sm:p-5 border border-border space-y-4 hover:border-orange-500/30 transition-all"
            >
              {/* Cluster Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/cluster/${cluster.id}`}
                        className="font-bold text-foreground text-sm sm:text-base hover:text-orange-500 transition-colors truncate"
                      >
                        {cluster.name}
                      </Link>
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-purple-500/15 text-purple-400 dark:text-purple-300">
                        {cluster.mock_test_count ?? 0} mocks
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {cluster.description || "No description yet."}
                    </p>
                  </div>
                </div>

                <button className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-3 py-1 font-semibold rounded-lg bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/15">
                  {cluster.ready_count || 0} ready
                </span>
                <span className="px-3 py-1 font-semibold rounded-lg bg-blue-500/10 text-blue-500 dark:bg-blue-500/15">
                  {cluster.processing_count || 0} running
                </span>
                <span className="px-3 py-1 font-semibold rounded-lg bg-amber-500/10 text-amber-500 dark:bg-amber-500/15">
                  {cluster.review_count || 0} review
                </span>
              </div>

              {/* Card Footer */}
              <div className="flex flex-col items-stretch gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimeAgo(cluster.updated_at)}</span>
                  <span>•</span>
                  <span className="min-w-0 truncate sm:max-w-[150px]">
                    Latest: {cluster.latest_mock_test_name || "PYQ"}
                  </span>
                </div>

                <Link
                  to={`/cluster/${cluster.id}`}
                  className="flex w-full items-center justify-center gap-1 rounded-lg border border-orange-500/30 px-3 py-1.5 text-xs font-semibold text-orange-500 transition-colors hover:bg-orange-500/10 sm:w-auto"
                >
                  Open <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
