import * as dashboardRepo from "../repositories/dashboard.repository.js";

export async function getSummary(workspaceId) {
  const [stats, recentClusters, activeJobs, recentMockTests] = await Promise.all([
    dashboardRepo.getSummaryStats(workspaceId),
    dashboardRepo.getRecentClusters(workspaceId, 3),
    dashboardRepo.getActiveJobs(workspaceId),
    dashboardRepo.getRecentMockTests(workspaceId, 3),
  ]);

  return { stats, recentClusters, activeJobs, recentMockTests };
}


