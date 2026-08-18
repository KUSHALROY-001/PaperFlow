import { pool } from "../db/pool.js";

export async function findWorkspaceBySlug(slug) {
  const result = await pool.query(
    `SELECT id, name FROM workspaces WHERE public_slug = $1`,
    [slug],
  );
  return result.rows[0] || null;
}

// Only what's safe to expose to an anonymous visitor - no settings, no
// marks_per_correct/negative_marks_per_wrong internals, no created_by.
// Matches the same is_catalog_listed + status='published' pair the
// migration 025 partial index is built for.
export async function listCatalogMockTests(workspaceId, { search, examYear }) {
  const conditions = [
    "mt.workspace_id = $1",
    "mt.is_catalog_listed = true",
    "mt.status = 'published'",
  ];
  const params = [workspaceId];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(mt.name ILIKE $${params.length} OR c.name ILIKE $${params.length})`,
    );
  }
  if (examYear) {
    params.push(examYear);
    conditions.push(`mt.exam_year = $${params.length}`);
  }

  const result = await pool.query(
    `
    SELECT
      mt.id,
      mt.name,
      mt.description,
      mt.exam_year,
      mt.duration_minutes,
      mt.total_questions,
      c.name AS cluster_name
    FROM mock_tests mt
    JOIN clusters c ON c.id = mt.cluster_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY mt.exam_year DESC NULLS LAST, mt.name ASC
    `,
    params,
  );
  return result.rows;
}

// Global, cross-workspace feed - the actual "I just landed on the site
// with no institute in mind" entry point (PublicCatalog.jsx's default
// "Public Mock Tests" tab). Deliberately joined to workspaces and
// filtered on public_slug IS NOT NULL - without that, a workspace that
// merely has one is_catalog_listed=true row but never activated a slug
// (so its own /catalog/:slug page can't even be reached) would still leak
// into a global feed it never opted into. workspaces.public_slug is the
// actual opt-in; is_catalog_listed alone only means "listed on MY page",
// not "listed everywhere".
export async function listAllPublicMockTests({ search, examYear }) {
  const conditions = [
    "w.public_slug IS NOT NULL",
    "mt.is_catalog_listed = true",
    "mt.status = 'published'",
  ];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(mt.name ILIKE $${params.length} OR c.name ILIKE $${params.length} OR w.name ILIKE $${params.length})`,
    );
  }
  if (examYear) {
    params.push(examYear);
    conditions.push(`mt.exam_year = $${params.length}`);
  }

  const result = await pool.query(
    `
    SELECT
      mt.id,
      mt.name,
      mt.description,
      mt.exam_year,
      mt.duration_minutes,
      mt.total_questions,
      c.name AS cluster_name,
      w.name AS workspace_name,
      w.public_slug AS workspace_slug
    FROM mock_tests mt
    JOIN clusters c ON c.id = mt.cluster_id
    JOIN workspaces w ON w.id = mt.workspace_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY mt.exam_year DESC NULLS LAST, mt.name ASC
    `,
    params,
  );
  return result.rows;
}

export async function listAllPublicExamYears() {
  const result = await pool.query(
    `
    SELECT DISTINCT mt.exam_year
    FROM mock_tests mt
    JOIN workspaces w ON w.id = mt.workspace_id
    WHERE w.public_slug IS NOT NULL
      AND mt.is_catalog_listed = true
      AND mt.status = 'published'
      AND mt.exam_year IS NOT NULL
    ORDER BY mt.exam_year DESC
    `,
  );
  return result.rows.map((row) => row.exam_year);
}

export async function listCatalogExamYears(workspaceId) {
  const result = await pool.query(
    `
    SELECT DISTINCT exam_year
    FROM mock_tests
    WHERE workspace_id = $1
      AND is_catalog_listed = true
      AND status = 'published'
      AND exam_year IS NOT NULL
    ORDER BY exam_year DESC
    `,
    [workspaceId],
  );
  return result.rows.map((row) => row.exam_year);
}

// Confirms the mock test is actually catalog-listed for this workspace
// before catalog.service.js hands off to sharedService.createOrGetShareLink
// - without this check, a visitor could start a share-worthy attempt on
// any mock_test_id by guessing a UUID, bypassing the is_catalog_listed
// gate entirely (createOrGetShareLink itself only checks status, not
// listing).
export async function findCatalogListedMockTest(mockTestId, workspaceId) {
  const result = await pool.query(
    `
    SELECT id
    FROM mock_tests
    WHERE id = $1
      AND workspace_id = $2
      AND is_catalog_listed = true
      AND status = 'published'
    `,
    [mockTestId, workspaceId],
  );
  return result.rows[0] || null;
}

// Full detail for the details card (CatalogBrowser.jsx's click-through) -
// same public-safety gates as every list function above
// (is_catalog_listed + published + the workspace's own public_slug
// opt-in), scoped by workspaceId when given (institute mode, called with
// the :slug route's resolved workspace) or open to any listed test across
// every opted-in workspace when omitted (global mode) - mirrors
// listCatalogMockTests vs listAllPublicMockTests's own workspaceId-or-not
// split above. Includes the marking scheme (marks_per_correct/
// negative_marks_per_wrong) that the list queries deliberately leave out -
// irrelevant for browsing a grid of cards, but exactly the kind of thing
// someone wants to see before committing to start, same as an institute's
// own students see on MockTestWorkspace.jsx.
export async function getCatalogMockTestDetail(mockTestId, workspaceId) {
  const conditions = [
    "mt.id = $1",
    "mt.is_catalog_listed = true",
    "mt.status = 'published'",
    "w.public_slug IS NOT NULL",
  ];
  const params = [mockTestId];
  if (workspaceId) {
    params.push(workspaceId);
    conditions.push(`mt.workspace_id = $${params.length}`);
  }

  const result = await pool.query(
    `
    SELECT
      mt.id,
      mt.name,
      mt.description,
      mt.exam_year,
      mt.duration_minutes,
      mt.total_questions,
      mt.marks_per_correct,
      mt.negative_marks_per_wrong,
      c.name AS cluster_name,
      w.name AS workspace_name,
      w.public_slug AS workspace_slug
    FROM mock_tests mt
    JOIN clusters c ON c.id = mt.cluster_id
    JOIN workspaces w ON w.id = mt.workspace_id
    WHERE ${conditions.join(" AND ")}
    `,
    params,
  );
  return result.rows[0] || null;
}

// Per-topic question counts for the SAME mock test getCatalogMockTestDetail
// just validated as listed - deliberately a second, ungated query rather
// than folding a GROUP BY into the detail query above (that would turn a
// single-row lookup into one-row-per-topic and complicate the "not
// found/not listed" 404 case for no benefit). Mirrors
// OverviewTab.jsx's own topicCounts reduction over `questions` exactly,
// just computed in SQL against `questions` directly instead of a
// client-side reduce over an already-fetched list - the catalog's public
// detail view never fetches full question rows the way the authenticated
// editor does, so there's nothing to reduce over client-side here.
export async function getCatalogMockTestTopics(mockTestId) {
  const result = await pool.query(
    `
    SELECT topic, COUNT(*)::int AS count
    FROM questions
    WHERE mock_test_id = $1 AND topic IS NOT NULL
    GROUP BY topic
    ORDER BY topic ASC
    `,
    [mockTestId],
  );
  return result.rows;
}
