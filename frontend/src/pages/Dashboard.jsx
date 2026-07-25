import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  FolderOpen,
  MoreVertical,
  Plus,
  Upload,
  Zap,
} from "lucide-react";
import CreateClusterModal from "../components/CreateClusterModal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

function SparklineWave({ color = "#ea580c" }) {
  return (
    <svg className="w-16 h-8 overflow-visible" viewBox="0 0 100 40" fill="none">
      <path
        d="M0 32 Q 25 38, 45 20 T 90 12 T 100 18"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function BannerIllustration() {
  return (
    <div className="relative w-44 h-28 hidden sm:block shrink-0">
      {/* Back card */}
      <div className="absolute right-0 top-1 w-32 h-20 bg-muted/60 dark:bg-card border border-border rounded-xl shadow-xs transform rotate-6" />
      {/* Middle card */}
      <div className="absolute right-3 top-3 w-32 h-20 bg-card border border-border rounded-xl shadow-sm transform rotate-3 p-2.5">
        <div className="w-full h-2 bg-orange-500/20 rounded-full mb-1.5" />
        <div className="w-3/4 h-2 bg-muted rounded-full" />
      </div>
      {/* Front main card */}
      <div className="absolute right-6 top-5 w-32 h-20 bg-card border border-border rounded-xl shadow-md p-2.5 flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[8px] font-bold">
              ✓
            </div>
            <div className="w-14 h-1.5 bg-muted rounded-full" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-[8px] font-bold">
              ✓
            </div>
            <div className="w-10 h-1.5 bg-muted rounded-full" />
          </div>
        </div>
        <div className="self-end w-5 h-5 rounded-full bg-[#ea580c] text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
          ✓
        </div>
      </div>
    </div>
  );
}

const DEFAULT_CLUSTERS = [
  {
    id: "cluster-jeca-1",
    name: "JECA",
    description: "zxczcxczc:",
    mock_test_count: 1,
    ready_count: 0,
    processing_count: 0,
    review_count: 0,
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    latest_mock_test_name: "PYQ",
  },
  {
    id: "cluster-jeca-2",
    name: "JECA!",
    description: "No description yet.",
    mock_test_count: 1,
    ready_count: 0,
    processing_count: 0,
    review_count: 0,
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    latest_mock_test_name: "bjhgjhgb",
  },
];

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: api.getDashboardSummary,
    refetchInterval: 10000,
  });

  const stats = data?.stats || {};
  const apiClusters = data?.recentClusters || [];
  const displayClusters =
    apiClusters.length > 0 ? apiClusters : DEFAULT_CLUSTERS;
  const activeJobs = data?.activeJobs || [];
  const needsReview = stats.needs_review || 0;

  const statCards = [
    {
      label: "Total Clusters",
      value: stats.total_clusters !== undefined ? stats.total_clusters : 2,
      subtext: "All your clusters",
      icon: FolderOpen,
      iconBg: "bg-orange-500/15 text-orange-500",
      waveColor: "#ea580c",
    },
    {
      label: "Mock Tests",
      value: stats.total_mock_tests !== undefined ? stats.total_mock_tests : 2,
      subtext: "Created inside clusters",
      icon: ClipboardList,
      iconBg: "bg-blue-500/15 text-blue-500",
      waveColor: "#3b82f6",
    },
    {
      label: "Completed Mocks",
      value: stats.completed_mocks || 0,
      subtext: "Tests finished",
      icon: CheckCircle2,
      iconBg: "bg-emerald-500/15 text-emerald-500",
      waveColor: "#10b981",
    },
    {
      label: "Needs Review",
      value: needsReview,
      subtext: "Requires attention",
      icon: AlertTriangle,
      iconBg: "bg-amber-500/15 text-amber-500",
      waveColor: "#f59e0b",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Organize clusters first, then build multiple mock tests inside each
            one.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl text-sm shadow-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> New Cluster
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-500">
          {error.message}
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="surface-card rounded-2xl p-4 sm:p-5 border border-border flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div
                className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0`}
              >
                <card.icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-3xl font-extrabold text-foreground tracking-tight">
                  {card.value}
                </div>
                <div className="text-xs font-bold text-foreground mt-1">
                  {card.label}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {card.subtext}
                </div>
              </div>
              <SparklineWave color={card.waveColor} />
            </div>
          </div>
        ))}
      </div>

      {/* Banner Card */}
      <div className="surface-card rounded-2xl p-5 sm:p-6 border border-orange-500/20 bg-gradient-to-r from-orange-500/5 via-orange-500/10 to-transparent flex items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            Cluster = workspace, Mock test = exam paper
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Example: create a JECA cluster, then add JECA PYQ 2024, JECA PYQ
            2023, and JECA Mock Test 1 inside it.
          </p>
          <div className="pt-1">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Create Cluster
            </button>
          </div>
        </div>
        <BannerIllustration />
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Clusters */}
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
            {displayClusters.map((cluster) => (
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
                          {cluster.mock_test_count || 1} mocks
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
                    <span>2d ago</span>
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
            ))}
          </div>
        </div>

        {/* Right Column: Active Jobs & Quick Actions */}
        <div className="space-y-6">
          {/* Active Mock Jobs */}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-3">
              Active Mock Jobs
            </h2>
            <div className="surface-card rounded-2xl p-4 text-center border border-border flex flex-col items-center justify-center min-h-[190px] sm:p-6">
              {activeJobs.length === 0 ? (
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
              ) : (
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

          {/* Quick Actions */}
          <div className="surface-card rounded-2xl p-5 border border-border">
            <h3 className="text-sm font-bold text-foreground mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <button
                onClick={() => setShowModal(true)}
                className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/60 transition-colors"
              >
                <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
                  New Cluster
                </span>
              </button>

              <Link
                to="/batch"
                className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/60 transition-colors"
              >
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
                  Batch Upload
                </span>
              </Link>

              <Link
                to="/templates"
                className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/60 transition-colors"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
                  Templates
                </span>
              </Link>

              <Link
                to="/analytics"
                className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/60 transition-colors"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
                  Analytics
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showModal && <CreateClusterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
