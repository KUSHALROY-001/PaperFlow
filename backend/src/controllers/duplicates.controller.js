import * as duplicatesService from "../services/duplicates.service.js";

export async function list(req, res) {
  const pairs = await duplicatesService.listPendingDuplicates(req.workspaceId);
  res.json({ pairs });
}

export async function count(req, res) {
  const count = await duplicatesService.countPendingDuplicates(req.workspaceId);
  res.json({ count });
}

export async function resolve(req, res) {
  const result = await duplicatesService.resolveDuplicate(
    req.workspaceId,
    req.params.pairId,
    {
      action: req.body.action,
      keepQuestionId: req.body.keepQuestionId,
      resolvedBy: req.user.id,
    },
  );
  res.json(result);
}
