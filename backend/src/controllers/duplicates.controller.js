import * as duplicatesService from "../services/duplicates.service.js";

export async function list(req, res) {
  const groups = await duplicatesService.listDuplicateGroups(
    req.workspaceId,
  );
  res.json({ groups });
}

export async function count(req, res) {
  const count = await duplicatesService.countDuplicateGroups(
    req.workspaceId,
  );
  res.json({ count });
}
