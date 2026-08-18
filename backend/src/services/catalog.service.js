import { httpError } from "../lib/http-error.js";
import * as catalogRepo from "../repositories/catalog.repository.js";
import { createOrGetShareLink } from "./shared.service.js";

async function resolveWorkspaceOrFail(slug) {
  const workspace = await catalogRepo.findWorkspaceBySlug(slug);
  if (!workspace) {
    throw httpError(404, "No public catalog found at this address");
  }
  return workspace;
}

export async function getCatalog(slug, { search, examYear }) {
  const workspace = await resolveWorkspaceOrFail(slug);
  const mockTests = await catalogRepo.listCatalogMockTests(workspace.id, {
    search,
    examYear,
  });
  return { workspaceName: workspace.name, mockTests };
}

export async function getCatalogExamYears(slug) {
  const workspace = await resolveWorkspaceOrFail(slug);
  return catalogRepo.listCatalogExamYears(workspace.id);
}

// slug present -> institute mode, scoped to that workspace only. slug
// omitted -> global mode, the test just needs to be listed by SOME
// opted-in workspace - mirrors getCatalog vs getGlobalCatalog's own
// slug-or-not split.
export async function getCatalogMockTestDetail(mockTestId, slug) {
  const workspaceId = slug ? (await resolveWorkspaceOrFail(slug)).id : null;
  const detail = await catalogRepo.getCatalogMockTestDetail(
    mockTestId,
    workspaceId,
  );
  if (!detail) {
    throw httpError(404, "This mock test isn't available in the catalog");
  }

  const topics = await catalogRepo.getCatalogMockTestTopics(mockTestId);
  return { ...detail, topics };
}

// The "Public Mock Tests" tab (default) on PublicCatalog.jsx - no slug at
// all, aggregates across every workspace that's opted a slug in. Rows
// carry their own workspace_slug so the frontend can start an attempt
// (and deep-link into that institute's own page) without a second
// lookup.
export async function getGlobalCatalog({ search, examYear }) {
  return catalogRepo.listAllPublicMockTests({ search, examYear });
}

export async function getGlobalCatalogExamYears() {
  return catalogRepo.listAllPublicExamYears();
}

// Reuses the existing share-link machinery entirely (see
// shared.service.js#createOrGetShareLink) rather than inventing a second
// anonymous-access path - the catalog's only job is discovery; once a
// visitor picks a test, everything downstream (guest name/email capture,
// attempt scoping, submit/results) is the same flow every /shared/:token
// link already uses.
export async function startCatalogAttempt(slug, mockTestId) {
  const workspace = await resolveWorkspaceOrFail(slug);
  const listed = await catalogRepo.findCatalogListedMockTest(
    mockTestId,
    workspace.id,
  );
  if (!listed) {
    throw httpError(404, "This mock test isn't available in the catalog");
  }
  return createOrGetShareLink({ mockTestId, workspaceId: workspace.id });
}
