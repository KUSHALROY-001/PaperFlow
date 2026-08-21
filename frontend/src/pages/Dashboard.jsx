import { Plus } from "lucide-react";
import CreateClusterModal from "../components/CreateClusterModal";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import StatCardGrid from "../components/dashboard/StatCardGrid";
import BannerCard from "../components/dashboard/BannerCard";
import RecentClustersList from "../components/dashboard/RecentClustersList";
import ActiveJobsPanel from "../components/dashboard/ActiveJobsPanel";
import QuickActionsPanel from "../components/dashboard/QuickActionsPanel";

export default function Dashboard() {
  const {
    showModal,
    setShowModal,
    isLoading,
    error,
    displayClusters,
    activeJobs,
    statCards,
  } = useDashboardSummary();

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

      <StatCardGrid statCards={statCards} isLoading={isLoading} />

      <BannerCard onCreateCluster={() => setShowModal(true)} />

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentClustersList clusters={displayClusters} isLoading={isLoading} />

        {/* Right Column: Active Jobs & Quick Actions */}
        <div className="space-y-6">
          <ActiveJobsPanel activeJobs={activeJobs} isLoading={isLoading} />
          <QuickActionsPanel onNewCluster={() => setShowModal(true)} />
        </div>
      </div>

      {showModal && <CreateClusterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
