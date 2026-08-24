import { pool } from "../db/pool.js";

// Explicit projection (not SELECT * / RETURNING *): every column is
// whitelisted and aliased to camelCase once, here, instead of leaking raw
// snake_case / internal columns (created_by, is_active, etc.) to every call
// site. Reused across reads AND writes below (via a wrapping CTE) so a row
// returned from createTemplate/updateTemplate has the exact same shape as
// one returned from a plain lookup.
const TEMPLATE_COLUMNS = `
  t.id,
  t.workspace_id AS "workspaceId",
  t.created_by AS "createdBy",
  t.slug,
  t.name,
  t.description,
  t.category,
  t.difficulty,
  t.question_count AS "questionCount",
  t.duration_minutes AS "durationMinutes",
  t.marks_per_correct AS "marksPerCorrect",
  t.negative_marks_per_wrong AS "negativeMarksPerWrong",
  t.tags,
  t.sections,
  t.color,
  t.is_popular AS "isPopular",
  t.is_active AS "isActive",
  t.usage_count AS "usageCount",
  t.rating,
  t.rating_count AS "ratingCount",
  t.settings,
  t.workspace_id IS NULL AS "systemTemplate",
  t.created_at AS "createdAt",
  t.updated_at AS "updatedAt"
`;

const templateSelect = `SELECT ${TEMPLATE_COLUMNS} FROM extraction_templates t`;

// Templates are visible to a workspace if they're global (workspace_id IS
// NULL) or owned by that workspace. Inactive templates are hidden from
// browsing but still individually fetchable via findAccessibleTemplateById
// (so an owner can re-activate or edit one they've turned off) - the two
// functions deliberately apply is_active differently.
export async function listAccessibleTemplates(
  workspaceId,
  { category, search } = {},
) {
  const conditions = [
    "(t.workspace_id IS NULL OR t.workspace_id = $1)",
    "t.is_active = TRUE",
  ];
  const params = [workspaceId];

  if (category) {
    params.push(category);
    conditions.push(`t.category = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const searchIndex = params.length;
    conditions.push(`(
      t.name ILIKE $${searchIndex}
      OR t.description ILIKE $${searchIndex}
      OR t.category ILIKE $${searchIndex}
      OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(t.tags) tag WHERE tag ILIKE $${searchIndex})
    )`);
  }

  const result = await pool.query(
    `
    ${templateSelect}
    WHERE ${conditions.join(" AND ")}
    ORDER BY (t.workspace_id IS NOT NULL) DESC, t.is_popular DESC, t.usage_count DESC, t.name ASC
    `,
    params,
  );

  return result.rows;
}

// Cheap bonus for building a dynamic category filter instead of a hardcoded
// list on the frontend - only reflects categories that actually have at
// least one active, accessible template.
export async function listTemplateCategories(workspaceId) {
  const result = await pool.query(
    `
    SELECT DISTINCT t.category
    FROM extraction_templates t
    WHERE (t.workspace_id IS NULL OR t.workspace_id = $1)
      AND t.is_active = TRUE
    ORDER BY t.category ASC
    `,
    [workspaceId],
  );

  return result.rows.map((row) => row.category);
}

// client defaults to the pool so this works standalone, but a caller inside
// a transaction (e.g. applyTemplate) can pass its own client so the read is
// scoped to that transaction - closing the check-then-act gap where the
// template could be deleted between the lookup and the insert that follows.
export async function findAccessibleTemplateById(
  templateId,
  workspaceId,
  client = pool,
) {
  const result = await client.query(
    `
    ${templateSelect}
    WHERE t.id = $1
      AND (t.workspace_id IS NULL OR t.workspace_id = $2)
    `,
    [templateId, workspaceId],
  );

  return result.rows[0] || null;
}

// Only a workspace's own custom templates can be mutated - global templates
// are platform-curated and read-only from this API. Kept separate from
// findAccessibleTemplateById so a caller can't accidentally treat a global,
// read-only template as editable just because the lookup succeeded.
export async function findOwnedTemplateById(
  templateId,
  workspaceId,
  client = pool,
) {
  const result = await client.query(
    `
    ${templateSelect}
    WHERE t.id = $1
      AND t.workspace_id = $2
    `,
    [templateId, workspaceId],
  );

  return result.rows[0] || null;
}

export async function createTemplate({
  workspaceId,
  createdBy,
  slug,
  name,
  description,
  category,
  difficulty,
  questionCount,
  durationMinutes,
  marksPerCorrect,
  negativeMarksPerWrong,
  tags,
  sections,
  color,
  isPopular = false,
  rating = null,
  settings = {},
}) {
  const result = await pool.query(
    `
    WITH inserted AS (
      INSERT INTO extraction_templates (
        workspace_id, created_by, slug, name, description, category, difficulty,
        question_count, duration_minutes, marks_per_correct, negative_marks_per_wrong,
        tags, sections, color, is_popular, rating, settings
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15, $16, $17::jsonb)
      RETURNING *
    )
    SELECT ${TEMPLATE_COLUMNS} FROM inserted t
    `,
    [
      workspaceId,
      createdBy,
      slug,
      name,
      description,
      category,
      difficulty,
      questionCount,
      durationMinutes,
      marksPerCorrect,
      negativeMarksPerWrong,
      JSON.stringify(tags),
      JSON.stringify(sections),
      color,
      isPopular,
      rating,
      JSON.stringify(settings),
    ],
  );

  return result.rows[0];
}

export async function updateTemplate(templateId, workspaceId, fields) {
  const result = await pool.query(
    `
    WITH updated AS (
      UPDATE extraction_templates
      SET
        slug = COALESCE($3, slug),
        name = COALESCE($4, name),
        description = CASE WHEN $5::boolean THEN $6 ELSE description END,
        category = COALESCE($7, category),
        difficulty = COALESCE($8, difficulty),
        question_count = COALESCE($9, question_count),
        duration_minutes = CASE WHEN $10::boolean THEN $11 ELSE duration_minutes END,
        marks_per_correct = COALESCE($12, marks_per_correct),
        negative_marks_per_wrong = COALESCE($13, negative_marks_per_wrong),
        tags = COALESCE($14::jsonb, tags),
        sections = COALESCE($15::jsonb, sections),
        color = COALESCE($16, color),
        is_popular = COALESCE($17, is_popular),
        is_active = COALESCE($18, is_active),
        rating = CASE WHEN $19::boolean THEN $20 ELSE rating END,
        settings = COALESCE($21::jsonb, settings)
      WHERE id = $1
        AND workspace_id = $2
      RETURNING *
    )
    SELECT ${TEMPLATE_COLUMNS} FROM updated t
    `,
    [
      templateId,
      workspaceId,
      fields.slug ?? null,
      fields.name ?? null,
      fields.descriptionProvided ?? false,
      fields.description ?? null,
      fields.category ?? null,
      fields.difficulty ?? null,
      fields.questionCount ?? null,
      fields.durationMinutesProvided ?? false,
      fields.durationMinutes ?? null,
      fields.marksPerCorrect ?? null,
      fields.negativeMarksPerWrong ?? null,
      fields.tags ? JSON.stringify(fields.tags) : null,
      fields.sections ? JSON.stringify(fields.sections) : null,
      fields.color ?? null,
      fields.isPopular ?? null,
      fields.isActive ?? null,
      fields.ratingProvided ?? false,
      fields.rating ?? null,
      fields.settings ? JSON.stringify(fields.settings) : null,
    ],
  );

  return result.rows[0] || null;
}

// Hard delete. Separate from deactivation (is_active = false via
// updateTemplate) - deleting removes the row outright, which fails on an FK
// constraint if extraction_template_applications still reference it. Prefer
// deactivation for templates with usage history.
export async function deleteTemplate(templateId, workspaceId) {
  const result = await pool.query(
    "DELETE FROM extraction_templates WHERE id = $1 AND workspace_id = $2 RETURNING id",
    [templateId, workspaceId],
  );

  return result.rowCount > 0;
}

// --- Apply flow -----------------------------------------------------------
// Deliberately no findClusterById here - cluster lookups belong to
// clusters.repository.js. The service calls
// clustersRepo.findClusterById(clusterId, workspaceId, client) directly.
// Keeping cluster access out of this file is what lets it stay scoped to
// one table instead of reimplementing another domain's lookup with a
// different (and easy-to-misuse) parameter order.

export async function createMockTestFromTemplate(
  client,
  {
    workspaceId,
    clusterId,
    createdBy,
    name,
    description,
    durationMinutes,
    marksPerCorrect,
    negativeMarksPerWrong,
    settings,
  },
) {
  const result = await client.query(
    `
    INSERT INTO mock_tests (
      workspace_id, cluster_id, created_by, name, description,
      duration_minutes, marks_per_correct, negative_marks_per_wrong, settings
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    RETURNING *
    `,
    [
      workspaceId,
      clusterId,
      createdBy,
      name,
      description,
      durationMinutes,
      marksPerCorrect,
      negativeMarksPerWrong,
      JSON.stringify(settings),
    ],
  );

  return result.rows[0];
}

// Usage is derived from this log by a DB trigger (see
// 004_extraction_templates_hardening.sql), not incremented by hand here -
// that keeps extraction_templates.usage_count from ever drifting out of
// sync with reality, and gives an audit trail of who applied what and when,
// which a bare counter can't.
export async function logTemplateApplication(
  client,
  { templateId, workspaceId, mockTestId, appliedBy },
) {
  const result = await client.query(
    `
    INSERT INTO extraction_template_applications (template_id, workspace_id, mock_test_id, applied_by)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [templateId, workspaceId, mockTestId, appliedBy],
  );

  return result.rows[0];
}

// --- Ratings ----------------------------------------------------------
// extraction_templates.rating/rating_count are kept in sync by a DB
// trigger (036_extraction_template_ratings.sql) - neither function here
// touches those columns directly, only this table.

// Upsert: submitting a rating again for the same (template, user) pair
// updates the existing row rather than creating a second one (UNIQUE
// (template_id, user_id) is what makes ON CONFLICT well-defined here).
export async function upsertRating(client, { templateId, userId, rating }) {
  const result = await client.query(
    `
    INSERT INTO extraction_template_ratings (template_id, user_id, rating)
    VALUES ($1, $2, $3)
    ON CONFLICT (template_id, user_id)
    DO UPDATE SET rating = EXCLUDED.rating
    RETURNING rating
    `,
    [templateId, userId, rating],
  );

  return result.rows[0];
}

export async function deleteRating(templateId, userId) {
  const result = await pool.query(
    "DELETE FROM extraction_template_ratings WHERE template_id = $1 AND user_id = $2 RETURNING id",
    [templateId, userId],
  );

  return result.rowCount > 0;
}

export async function findRatingForUser(templateId, userId) {
  const result = await pool.query(
    "SELECT rating FROM extraction_template_ratings WHERE template_id = $1 AND user_id = $2",
    [templateId, userId],
  );

  return result.rows[0]?.rating ?? null;
}

// Batch form, used by listTemplates so "did I already rate this" for an
// entire page of templates is one query, not N - returns a plain
// { [templateId]: rating } map rather than rows, so the service layer can
// merge it into the already-mapped template list with a simple lookup.
export async function findRatingsForUser(userId, templateIds) {
  if (templateIds.length === 0) return {};

  const result = await pool.query(
    `
    SELECT template_id AS "templateId", rating
    FROM extraction_template_ratings
    WHERE user_id = $1
      AND template_id = ANY($2::uuid[])
    `,
    [userId, templateIds],
  );

  return Object.fromEntries(
    result.rows.map((row) => [row.templateId, row.rating]),
  );
}
