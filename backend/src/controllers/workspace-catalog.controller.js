import * as workspaceCatalogService from "../services/workspace-catalog.service.js";

export async function getSettings(req, res) {
  const settings = await workspaceCatalogService.getCatalogSettings(
    req.workspaceId,
  );
  res.json({ settings });
}

export async function updateSlug(req, res) {
  const settings = await workspaceCatalogService.updatePublicSlug(
    req.workspaceId,
    req.body.slug,
  );
  res.json({ settings });
}
