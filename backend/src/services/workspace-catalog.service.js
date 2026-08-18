import { httpError } from "../lib/http-error.js";
import { requiredString } from "../lib/validators.js";
import * as workspaceCatalogRepo from "../repositories/workspace-catalog.repository.js";

// Lowercase letters, digits, hyphens - matches how the slug will actually
// appear in a URL path segment, and rules out anything that would need
// encoding there. Deliberately stricter than CITEXT's own equality
// semantics allow, so what an admin types is exactly what shows up in the
// shareable link, with no surprises from case-folding at compare time.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function getCatalogSettings(workspaceId) {
  const settings =
    await workspaceCatalogRepo.getWorkspaceCatalogSettings(workspaceId);
  if (!settings) {
    throw httpError(404, "Workspace not found");
  }
  const mockTests =
    await workspaceCatalogRepo.listMockTestsForCatalogAdmin(workspaceId);
  return { ...settings, mockTests };
}

export async function updatePublicSlug(workspaceId, rawSlug) {
  const slug = requiredString(rawSlug, "slug").toLowerCase();
  if (!SLUG_PATTERN.test(slug)) {
    throw httpError(
      400,
      "Slug can only contain lowercase letters, numbers, and hyphens (no leading/trailing/double hyphens)",
    );
  }
  if (slug.length < 3 || slug.length > 60) {
    throw httpError(400, "Slug must be between 3 and 60 characters");
  }

  const { row, conflict } = await workspaceCatalogRepo.setPublicSlug(
    workspaceId,
    slug,
  );
  if (conflict) {
    throw httpError(409, "That slug is already taken - try another one");
  }
  if (!row) {
    throw httpError(404, "Workspace not found");
  }
  return row;
}
