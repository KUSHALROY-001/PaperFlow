import * as reviewQueueRepo from "../repositories/review-queue.repository.js";
import { attachDiagramUrls } from "./question-assets.service.js";

const VALID_SORTS = ["confidence_asc", "question_no_asc", "created_at_desc"];

// Cursors are opaque base64 JSON to the client (like every other keyset-
// paginated list in this codebase) - {value, id} is only meaningful
// paired with the sort mode that produced it, so a cursor from a
// confidence_asc page silently reused after switching to question_no_asc
// would produce nonsense results. The frontend hook resets its cursor
// whenever filters/sort change (see useReviewQueue.js) rather than this
// layer trying to detect a mismatched cursor after the fact.
function encodeCursor(value, id) {
  return Buffer.from(JSON.stringify({ value, id })).toString("base64url");
}

function decodeCursor(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (parsed.id && parsed.value !== undefined) return parsed;
  } catch {
    // Malformed/tampered cursor - treat as "start from the top" rather
    // than erroring the whole page out.
  }
  return null;
}

function parseFilters(query) {
  const sort = VALID_SORTS.includes(query.sort) ? query.sort : "confidence_asc";
  const maxConfidence =
    query.maxConfidence !== undefined && query.maxConfidence !== ""
      ? Number(query.maxConfidence)
      : null;
  const hasAiIssues =
    query.hasAiIssues === "true" || query.hasAiIssues === true;
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);

  return {
    clusterId: query.clusterId || null,
    mockTestId: query.mockTestId || null,
    maxConfidence:
      Number.isFinite(maxConfidence) &&
      maxConfidence >= 0 &&
      maxConfidence <= 100
        ? maxConfidence
        : null,
    hasAiIssues,
    sort,
    limit,
  };
}

// Same camelCase shape mapQuestion (mockTestHelpers.js) produces for a
// single mock test's question list, plus the breadcrumb fields (cluster/
// mock test id+name) this cross-cluster view needs that a single-mock-
// test view never did. Done server-side here rather than leaving the
// frontend to map raw snake_case, since this endpoint is the only
// consumer of this particular row shape (unlike mock-tests.service.js's
// listQuestions, which the frontend's own mapQuestion already handles).
function serializeQueueItem(row) {
  const options = (row.options || []).map((option) => option.optionText);
  const metadata = row.metadata || {};
  const aiIssues = Array.isArray(metadata.aiIssues) ? metadata.aiIssues : [];

  return {
    id: row.id,
    questionNo: row.question_no,
    topic: row.topic || "Untitled",
    subtopic: row.subtopic || null,
    passage: row.passage || null,
    confidence: row.confidence,
    text: row.question_text,
    explanation: row.explanation || null,
    options,
    correctOptionIndexes: row.correct_option_indexes || [],
    diagramUrl: row.diagramUrl || null,
    placement: row.placement || "below_text",
    aiIssues,
    aiNeedsReview: metadata.aiNeedsReview || false,
    sourceLine: row.source_page ? `Page ${row.source_page}` : "Manual entry",
    clusterId: row.cluster_id,
    clusterName: row.cluster_name,
    mockTestId: row.mock_test_id,
    mockTestName: row.mock_test_name,
  };
}

export async function getReviewQueue(workspaceId, query) {
  const filters = parseFilters(query);
  const cursor = decodeCursor(query.cursor);

  const { rows } = await reviewQueueRepo.listNeedsReview(workspaceId, {
    ...filters,
    cursor,
  });

  const enriched = await attachDiagramUrls(rows, workspaceId, {
    idField: "id",
  });

  const questions = enriched.map(serializeQueueItem);

  // Pull the cursor value back off the raw DB row (before serialization
  // drops unmapped columns), using whichever column this sort mode is
  // actually ordering by.
  let nextCursor = null;
  if (rows.length === filters.limit) {
    const lastRow = rows[rows.length - 1];
    const cursorValue =
      filters.sort === "question_no_asc"
        ? lastRow.question_no
        : filters.sort === "created_at_desc"
          ? lastRow.created_at
          : (lastRow.confidence ?? 999);
    nextCursor = encodeCursor(cursorValue, lastRow.id);
  }

  return { questions, nextCursor };
}

export async function getReviewQueueCount(workspaceId, query) {
  const filters = parseFilters(query);
  const count = await reviewQueueRepo.countNeedsReview(workspaceId, filters);
  return { count };
}
