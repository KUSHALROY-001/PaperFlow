import * as dashboardService from "../services/dashboard.service.js";

export async function summary(req, res) {
  const result = await dashboardService.getSummary(req.workspaceId);
  res.json(result);
}
