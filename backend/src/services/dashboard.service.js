import * as dashboardRepo from "../repositories/dashboard.repository.js";

export async function getSummary(workspaceId) {
  const [stats, recentClusters, activeJobs] = await Promise.all([
    dashboardRepo.getSummaryStats(workspaceId),
    dashboardRepo.getRecentClusters(workspaceId),
    dashboardRepo.getActiveJobs(workspaceId),
  ]);

  return { stats, recentClusters, activeJobs };
}
