import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FolderOpen,
} from "lucide-react";
import { api } from "@/lib/api";

// Extracted from pages/Dashboard.jsx — same behavior, plus one fix:
// the "Total Clusters" / "Mock Tests" stat fallbacks used to be hardcoded
// to the number 2, which only happened to match DEFAULT_CLUSTERS by
// coincidence. They're now derived from the actual list being displayed,
// so they can't silently drift out of sync with it.
export function useDashboardSummary() {
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: api.getDashboardSummary,
    refetchInterval: 10000,
  });

  const stats = data?.stats || {};
  const displayClusters = (data?.recentClusters || []).slice(0, 3);
  const activeJobs = data?.activeJobs || [];
  const recentMockTests = (data?.recentMockTests || []).slice(0, 3);
  const needsReview = stats.needs_review || 0;

  const fallbackTotalClusters = displayClusters.length;
  const fallbackTotalMockTests = displayClusters.reduce(
    (sum, cluster) => sum + (cluster.mock_test_count || 0),
    0,
  );

  const statCards = [
    {
      label: "Total Clusters",
      value:
        stats.total_clusters !== undefined
          ? stats.total_clusters
          : fallbackTotalClusters,
      subtext: "All your clusters",
      icon: FolderOpen,
      iconBg: "bg-orange-500/15 text-orange-500",
      waveColor: "#ea580c",
    },
    {
      label: "Mock Tests",
      value:
        stats.total_mock_tests !== undefined
          ? stats.total_mock_tests
          : fallbackTotalMockTests,
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

  return {
    showModal,
    setShowModal,
    isLoading,
    error,
    displayClusters,
    activeJobs,
    recentMockTests,
    statCards,
  };
}
