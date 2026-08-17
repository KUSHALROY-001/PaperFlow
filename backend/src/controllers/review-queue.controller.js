import * as reviewQueueService from "../services/review-queue.service.js";

export async function list(req, res) {
  const result = await reviewQueueService.getReviewQueue(
    req.workspaceId,
    req.query,
  );
  res.json(result);
}

export async function count(req, res) {
  const result = await reviewQueueService.getReviewQueueCount(
    req.workspaceId,
    req.query,
  );
  res.json(result);
}
