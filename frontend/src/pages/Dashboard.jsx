import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ClipboardList,
  Clock,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Zap,
} from "lucide-react";
import CreateClusterModal from "../components/CreateClusterModal";
import { api } from "@/lib/api";

function formatTimeAgo(dateStr) {
  if (!dateStr) return "-";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: api.getDashboardSummary,
    refetchInterval: 10000,
  });

  const stats = data?.stats || {};
  const recentClusters = data?.recentClusters || [];
  const activeJobs = data?.activeJobs || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Organize clusters first, then build multiple mock tests inside each
            one.
          </p>
          {isLoading && (
            <p className="mt-1 text-xs text-muted-foreground">
              Loading workspace summary...
            </p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 gradient-violet text-white font-semibold rounded-xl shadow-lg shadow-violet-200 hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" /> New Cluster
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-medium text-red-700">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Clusters",
            value: stats.total_clusters || 0,
            icon: FolderOpen,
            color: "text-violet-600",
            bg: "bg-violet-100",
          },
          {
            label: "Mock Tests",
            value: stats.total_mock_tests || 0,
            icon: ClipboardList,
            color: "text-blue-600",
            bg: "bg-blue-100",
          },
          {
            label: "Completed Mocks",
            value: stats.completed_mocks || 0,
            icon: CheckCircle,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
          },
          {
            label: "Needs Review",
            value: stats.needs_review || 0,
            icon: AlertTriangle,
            color: "text-amber-600",
            bg: "bg-amber-100",
          },
        ].map((card) => (
          <div key={card.label} className="card-lavender rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}
              >
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              {card.value}
            </div>
            <div className="text-sm text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="gradient-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            Cluster = workspace, mock test = exam paper
          </h3>
          <p className="text-sm text-muted-foreground">
            Example: create a JECA cluster, then add JECA PYQ 2024, JECA PYQ
            2023, and JECA Mock Test 1 inside it.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 gradient-violet text-white font-semibold rounded-xl shadow-lg shadow-violet-200 hover:opacity-90 transition-all whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Create Cluster
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">
              Recent Clusters
            </h2>
            <Link
              to="/clusters"
              className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentClusters.length === 0 && (
              <div className="card-lavender rounded-2xl p-8 text-sm text-muted-foreground">
                No clusters yet. Create your first cluster to begin.
              </div>
            )}
            {recentClusters.map((cluster) => (
              <div
                key={cluster.id}
                className="card-lavender rounded-2xl p-5 hover:shadow-lg transition-all group"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {cluster.name}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 shrink-0">
                        <ClipboardList className="h-3 w-3" />
                        {cluster.mock_test_count} mocks
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {cluster.description || "No description yet."}
                    </p>
                  </div>
                  <button className="w-8 h-8 rounded-xl hover:bg-violet-100 flex items-center justify-center transition-colors ml-2">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    {cluster.ready_count} ready
                  </div>
                  <div className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
                    {cluster.processing_count} running
                  </div>
                  <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                    {cluster.review_count} review
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{" "}
                      {formatTimeAgo(cluster.updated_at)}
                    </span>
                    <span>
                      Latest:{" "}
                      {cluster.latest_mock_test_name || "No mock tests yet"}
                    </span>
                  </div>
                  <Link
                    to={`/cluster/${cluster.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 font-semibold rounded-lg text-xs hover:bg-violet-200 transition-colors"
                  >
                    Open <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            Active Mock Jobs
          </h2>
          {activeJobs.length === 0 ? (
            <div className="card-lavender rounded-2xl p-8 text-center">
              <Zap className="w-8 h-8 text-violet-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No mock tests processing
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeJobs.map((job) => (
                <div key={job.id} className="card-lavender rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-violet-500 pulse-violet" />
                    <span className="text-sm font-semibold text-foreground truncate">
                      {job.mock_test_name}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>
                      {job.cluster_name} / {job.current_stage || job.status}
                    </span>
                    <span>{job.progress_percent || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-violet-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full shimmer"
                      style={{
                        width: `${Math.max(job.progress_percent || 0, 8)}%`,
                      }}
                    />
                  </div>
                  <Link
                    to={`/cluster/${job.cluster_id}/mocktest/${job.mock_test_id}`}
                    className="mt-2 text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                  >
                    View mock <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && <CreateClusterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
