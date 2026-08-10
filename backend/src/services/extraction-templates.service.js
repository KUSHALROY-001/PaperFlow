import { pool } from "../db/pool.js";
import { httpError } from "../lib/http-error.js";
import {
  optionalNumber,
  optionalString,
  requiredEnum,
  requiredString,
} from "../lib/validators.js";
import * as clustersRepo from "../repositories/clusters.repository.js";
import * as templatesRepo from "../repositories/extraction-templates.repository.js";

// Closed sets, not free strings, so a bad category/color/difficulty is
// rejected at the service boundary instead of silently reaching the DB or
// the frontend's rendering logic (colors in particular are tied to a fixed
// Tailwind palette on the client).
const CATEGORIES = [
  "entrance_exam",
  "government_exam",
  "banking_exam",
  "school_exam",
  "custom",
  "study_notes",
];
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Variable"];
const COLORS = [
  "orange",
  "blue",
  "emerald",
  "amber",
  "rose",
  "teal",
  "purple",
  "indigo",
];

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "template"
  );
}

// Composed rather than duplicated: requiredPositiveInteger builds on
// positiveInteger, which builds on positiveNumber, which builds on the
// shared optionalNumber parser. Every numeric field - including the ones
// that drive exam scoring (marksPerCorrect, negativeMarksPerWrong) - passes
// through a Number.isFinite + range check before it can reach the DB.
function positiveNumber(value, fieldName, fallback) {
  const parsed = optionalNumber(value, fallback);

  if (parsed === null || parsed === undefined) {
    return parsed ?? null;
  }

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw httpError(400, `${fieldName} must be greater than 0`);
  }

  return parsed;
}

function positiveInteger(value, fieldName, fallback) {
  const parsed = positiveNumber(value, fieldName, fallback);

  if (parsed === null || parsed === undefined) {
    return parsed ?? null;
  }

  if (!Number.isInteger(parsed)) {
    throw httpError(400, `${fieldName} must be a whole number`);
  }

  return parsed;
}

function requiredPositiveInteger(value, fieldName) {
  const parsed = positiveInteger(value, fieldName, null);

  if (parsed === null) {
    throw httpError(400, `${fieldName} is required`);
  }

  return parsed;
}

function nonNegativeNumber(value, fieldName, fallback) {
  const parsed = optionalNumber(value, fallback);

  if (parsed === null || parsed === undefined) {
    return parsed ?? null;
  }

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw httpError(400, `${fieldName} must be 0 or greater`);
  }

  return parsed;
}

function ratingValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw httpError(400, "rating must be between 0 and 5");
  }

  return rating;
}

// Unlike nonNegativeNumber above (built around "value is optional, fall
// back to a sensible default like 1 or 0.25 if it's missing/garbage"),
// a section's marksPerCorrect/negativeMarksPerWrong override is only
// ever validated here once the caller has ALREADY confirmed the key is
// present - so garbage input at this point (e.g. "marksPerCorrect":
// "abc") should be a real 400, not silently coerced into null the way
// reusing nonNegativeNumber with no fallback would do.
function requiredNonNegativeNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw httpError(400, `${fieldName} must be a number 0 or greater`);
  }
  return parsed;
}

function normalizeStringArray(value, fieldName) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw httpError(400, `${fieldName} must be an array`);
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item)))
    .filter(Boolean);
}

// sections used to be a flat array of topic-name strings (see migration
// 002); as of 010_extraction_templates_syllabus.sql each element is a
// structured object instead - { name, topics, questionCount?,
// marksPerCorrect?, negativeMarksPerWrong? } - so it needs its own
// validator rather than reusing normalizeStringArray above.
function normalizeSections(value, fieldName) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw httpError(400, `${fieldName} must be an array`);
  }

  return value.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw httpError(
        400,
        `${fieldName}[${index}] must be an object with a "name" field`,
      );
    }

    const name = requiredString(item.name, `${fieldName}[${index}].name`);
    const topics =
      normalizeStringArray(item.topics, `${fieldName}[${index}].topics`) ?? [];

    const section = { name, topics };

    // These three stay OMITTED (not defaulted to 0/null) when not
    // supplied - a section without its own override is meant to fall
    // back to the mock test's own top-level marksPerCorrect /
    // negativeMarksPerWrong / no fixed count, not to silently acquire a
    // 0 that looks like a deliberate value. See buildTemplateContext in
    // mock-tests.service.js, which reads these the same way.
    if (item.questionCount !== undefined && item.questionCount !== null) {
      section.questionCount = requiredPositiveInteger(
        item.questionCount,
        `${fieldName}[${index}].questionCount`,
      );
    }
    if (item.marksPerCorrect !== undefined && item.marksPerCorrect !== null) {
      section.marksPerCorrect = requiredNonNegativeNumber(
        item.marksPerCorrect,
        `${fieldName}[${index}].marksPerCorrect`,
      );
    }
    if (
      item.negativeMarksPerWrong !== undefined &&
      item.negativeMarksPerWrong !== null
    ) {
      section.negativeMarksPerWrong = requiredNonNegativeNumber(
        item.negativeMarksPerWrong,
        `${fieldName}[${index}].negativeMarksPerWrong`,
      );
    }

    return section;
  });
}

function handleDuplicateTemplate(error) {
  if (error.code === "23505") {
    throw httpError(409, "A template with this slug already exists");
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export async function listTemplates(workspaceId, query) {
  const category = query.category
    ? requiredEnum(query.category, CATEGORIES, "category")
    : undefined;
  const search = optionalString(query.search);

  const [templates, categories] = await Promise.all([
    templatesRepo.listAccessibleTemplates(workspaceId, { category, search }),
    templatesRepo.listTemplateCategories(workspaceId),
  ]);

  return { templates, categories };
}

export async function getTemplateOrFail(templateId, workspaceId, client) {
  const template = await templatesRepo.findAccessibleTemplateById(
    templateId,
    workspaceId,
    client,
  );

  if (!template) {
    throw httpError(404, "Template not found");
  }

  return template;
}

// ---------------------------------------------------------------------------
// Create
// Custom templates are always workspace-owned - there is no way for this API
// to create a global one; that's a deliberate seed/admin-only distinction.
// ---------------------------------------------------------------------------
export async function createTemplate(workspaceId, userId, body) {
  const name = requiredString(body.name, "name");
  const description = optionalString(body.description);
  const category = requiredEnum(
    body.category || "custom",
    CATEGORIES,
    "category",
  );
  const difficulty = requiredEnum(
    body.difficulty || "Variable",
    DIFFICULTIES,
    "difficulty",
  );
  const color = requiredEnum(body.color || "purple", COLORS, "color");

  const questionCount = requiredPositiveInteger(
    body.questionCount,
    "questionCount",
  );
  const durationMinutes = positiveInteger(
    body.durationMinutes,
    "durationMinutes",
    null,
  );
  const marksPerCorrect = nonNegativeNumber(
    body.marksPerCorrect,
    "marksPerCorrect",
    1,
  );
  const negativeMarksPerWrong = nonNegativeNumber(
    body.negativeMarksPerWrong,
    "negativeMarksPerWrong",
    0.25,
  );
  const tags = normalizeStringArray(body.tags, "tags") ?? [];
  const sections = normalizeSections(body.sections, "sections") ?? [];
  const isPopular = Boolean(body.isPopular);
  const rating = ratingValue(body.rating);
  const settings =
    body.settings && typeof body.settings === "object" ? body.settings : {};

  const baseSlug = optionalString(body.slug) || slugify(name);

  // Workspace-scoped slugs only need to be unique within the workspace (see
  // idx_extraction_templates_workspace_slug), so a short retry loop is
  // enough - collisions are rare and cheap to resolve here rather than
  // forcing the caller to pick a slug themselves. The last attempt still
  // falls through to handleDuplicateTemplate as a safety net in case of a
  // concurrent insert racing us on the last slug variant too.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

    try {
      return await templatesRepo.createTemplate({
        workspaceId,
        createdBy: userId,
        slug,
        name,
        description,
        category,
        difficulty,
        color,
        questionCount,
        durationMinutes,
        marksPerCorrect,
        negativeMarksPerWrong,
        tags,
        sections,
        isPopular,
        rating,
        settings,
      });
    } catch (error) {
      if (error.code !== "23505" || attempt === 4) {
        handleDuplicateTemplate(error);
      }
      // otherwise: slug collision, try the next suffix
    }
  }
}

// ---------------------------------------------------------------------------
// Update
// Mirrors createTemplate's validators field-for-field so a value that would
// be rejected on create can't sneak in later via update (e.g. questionCount
// <= 0, or a marksPerCorrect that fails Number.isFinite).
// ---------------------------------------------------------------------------
export async function updateTemplate(templateId, workspaceId, body) {
  const descriptionProvided = body.description !== undefined;
  const durationMinutesProvided = body.durationMinutes !== undefined;
  const ratingProvided = body.rating !== undefined;
  const tags = normalizeStringArray(body.tags, "tags");
  const sections = normalizeSections(body.sections, "sections");

  const template = await templatesRepo.updateTemplate(templateId, workspaceId, {
    slug:
      body.slug === undefined ? undefined : requiredString(body.slug, "slug"),
    name:
      body.name === undefined ? undefined : requiredString(body.name, "name"),
    descriptionProvided,
    description: optionalString(body.description),
    category:
      body.category === undefined
        ? undefined
        : requiredEnum(body.category, CATEGORIES, "category"),
    difficulty:
      body.difficulty === undefined
        ? undefined
        : requiredEnum(body.difficulty, DIFFICULTIES, "difficulty"),
    color:
      body.color === undefined
        ? undefined
        : requiredEnum(body.color, COLORS, "color"),
    questionCount:
      body.questionCount === undefined
        ? undefined
        : requiredPositiveInteger(body.questionCount, "questionCount"),
    durationMinutesProvided,
    durationMinutes: durationMinutesProvided
      ? positiveInteger(body.durationMinutes, "durationMinutes", null)
      : undefined,
    marksPerCorrect:
      body.marksPerCorrect === undefined
        ? undefined
        : nonNegativeNumber(body.marksPerCorrect, "marksPerCorrect", null),
    negativeMarksPerWrong:
      body.negativeMarksPerWrong === undefined
        ? undefined
        : nonNegativeNumber(
            body.negativeMarksPerWrong,
            "negativeMarksPerWrong",
            null,
          ),
    tags,
    sections,
    isPopular: typeof body.isPopular === "boolean" ? body.isPopular : undefined,
    isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    ratingProvided,
    rating: ratingValue(body.rating),
    settings:
      body.settings && typeof body.settings === "object"
        ? body.settings
        : undefined,
  });

  if (!template) {
    throw httpError(404, "Template not found");
  }

  return template;
}

export async function deleteTemplate(templateId, workspaceId) {
  const deleted = await templatesRepo.deleteTemplate(templateId, workspaceId);

  if (!deleted) {
    throw httpError(404, "Template not found");
  }
}

// ---------------------------------------------------------------------------
// Apply
// Creates a real mock_test in the chosen cluster, pre-filled from the
// template's defaults, and logs the application. usage_count is bumped by a
// DB trigger reading that log (see 004_extraction_templates_hardening.sql),
// so it can never drift from the log the way a hand-incremented counter
// could if a caller forgot to call it on some code path.
//
// Both the template and the cluster are fetched *inside* the transaction
// (via the same `client`), not before BEGIN. Fetching them beforehand would
// leave a window where either row could be deleted between the check and
// the insert that follows - small, but real, and cheap to close by scoping
// the reads to the transaction.
// ---------------------------------------------------------------------------
export async function applyTemplate(templateId, workspaceId, userId, body) {
  const clusterId = requiredString(body.clusterId, "clusterId");
  const requestedName = optionalString(body.name);
  const requestedDescription = optionalString(body.description);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const template = await getTemplateOrFail(templateId, workspaceId, client);

    const cluster = await clustersRepo.findClusterById(
      clusterId,
      workspaceId,
      client,
    );
    if (!cluster) {
      throw httpError(404, "Cluster not found");
    }

    const name = requestedName || template.name;
    const description = requestedDescription || template.description;

    // mock_tests.duration_minutes is NOT NULL (unlike a template's, which
    // can be NULL for "Variable"), so a concrete default is required at
    // this boundary - 120 matches the fallback used when creating a mock
    // test by hand (see CreateMockTestModal on the frontend).
    const durationMinutes = template.durationMinutes ?? 120;

    const mockTest = await templatesRepo.createMockTestFromTemplate(client, {
      workspaceId,
      clusterId,
      createdBy: userId,
      name,
      description,
      durationMinutes,
      marksPerCorrect: template.marksPerCorrect,
      negativeMarksPerWrong: template.negativeMarksPerWrong,
      settings: {
        ...template.settings,
        templateId: template.id,
        templateSlug: template.slug,
        templateName: template.name,
        sections: template.sections ?? [],
        tags: template.tags ?? [],
        // Snapshotted at apply time, not looked up again later - a template
        // can be edited or deleted after this mock test exists, and the job
        // that eventually consumes this (queueProcessingJob in
        // mock-tests.service.js) should see what the user actually applied,
        // not whatever the template happens to say by upload time.
        expectedQuestionCount: template.questionCount ?? null,
      },
    });

    await templatesRepo.logTemplateApplication(client, {
      templateId: template.id,
      workspaceId,
      mockTestId: mockTest.id,
      appliedBy: userId,
    });

    await client.query("COMMIT");

    return { mockTest, template };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw httpError(
        409,
        `A mock test named "${requestedName || "this"}" already exists in this cluster`,
      );
    }

    throw error;
  } finally {
    client.release();
  }
}
