import { pool } from "../db/pool.js";

// Sort modes the queue supports. Each maps to an ORDER BY expression and
// the column used as the keyset cursor's primary comparison value - id is
// always the tie-breaker since none of these primary columns are unique
// on their own (question_no repeats across mock tests, confidence and
// created_at both repeat too).
//
// confidence_asc (the default) is the whole point of the queue: it's what
// makes this a *prioritized* inbox instead of Question Bank with a filter
// already applied - the AI's least-certain extractions surface first.
// NULL confidence (a question with no AI-assigned score at all, e.g. one
// added by hand) sorts LAST here via COALESCE, not first - a NULL isn't
// "low confidence", it's "unscored", and burying actually-low-confidence
// items behind a pile of manually-created ones would defeat the sort's
// purpose.
const SORT_MODES = {
  confidence_asc: {
    valueExpr: "COALESCE(q.confidence, 999)",
    direction: "ASC",
    cursorCast: "::numeric",
  },
  question_no_asc: {
    valueExpr: "q.question_no",
    direction: "ASC",
    cursorCast: "::int",
  },
  created_at_desc: {
    valueExpr: "q.created_at",
    direction: "DESC",
    cursorCast: "::timestamptz",
  },
};

function resolveSort(sort) {
  return SORT_MODES[sort] || SORT_MODES.confidence_asc;
}

// Builds the WHERE-clause fragments and params shared by both
// listNeedsReview and countNeedsReview, so the two can never silently
// drift apart on what counts as "in the queue" (e.g. count says 47 but
// the list only ever shows 40 because a filter was added to one and not
// the other).
function buildFilters(
  workspaceId,
  { clusterId, mockTestId, maxConfidence, hasAiIssues },
  startParamIndex,
) {
  const clauses = [
    "q.workspace_id = $1",
    "q.status = 'needs_review'",
  ];
  const params = [workspaceId];
  let i = startParamIndex;

  if (clusterId) {
    clauses.push(`c.id = $${i}`);
    params.push(clusterId);
    i += 1;
  }
  if (mockTestId) {
    clauses.push(`mt.id = $${i}`);
    params.push(mockTestId);
    i += 1;
  }
  // Ceiling, not floor - "show me the ones that still need a second look",
  // not "hide the ones the AI was unsure about". Deliberately named
  // maxConfidence (not minConfidence, despite the original plan text)
  // since a floor filter doesn't serve this page's actual purpose: the
  // confidence_asc sort already handles "lowest first" on its own, so the
  // one thing worth filtering on is "don't bother me with anything above
  // X%".
  if (maxConfidence !== undefined && maxConfidence !== null) {
    clauses.push(`COALESCE(q.confidence, 0) <= $${i}`);
    params.push(maxConfidence);
    i += 1;
  }
  if (hasAiIssues) {
    clauses.push(
      "jsonb_array_length(COALESCE(q.metadata->'aiIssues', '[]'::jsonb)) > 0",
    );
  }

  return { whereSql: clauses.join(" AND "), params, nextIndex: i };
}

export async function listNeedsReview(
  workspaceId,
  {
    clusterId,
    mockTestId,
    maxConfidence,
    hasAiIssues,
    sort = "confidence_asc",
    cursor,
    limit = 20,
  } = {},
) {
  const sortMode = resolveSort(sort);
  const { whereSql, params, nextIndex } = buildFilters(
    workspaceId,
    { clusterId, mockTestId, maxConfidence, hasAiIssues },
    2,
  );

  let cursorSql = "";
  let queryParams = params;
  let paramIndex = nextIndex;

  // Keyset (not OFFSET) pagination - OFFSET gets more expensive per page
  // as the queue grows and, worse, can skip or repeat rows if a question
  // is approved/rejected out of the list between page fetches, which is
  // exactly the kind of write this page does constantly.
  if (cursor && cursor.value !== undefined && cursor.id) {
    const op = sortMode.direction === "ASC" ? ">" : "<";
    cursorSql = `
      AND (
        ${sortMode.valueExpr} ${op} $${paramIndex}${sortMode.cursorCast}
        OR (
          ${sortMode.valueExpr} = $${paramIndex}${sortMode.cursorCast}
          AND q.id > $${paramIndex + 1}
        )
      )
    `;
    queryParams = [...params, cursor.value, cursor.id];
    paramIndex += 2;
  }

  const limitParamIndex = paramIndex;
  queryParams = [...queryParams, limit];

  const result = await pool.query(
    `
    SELECT
      q.*,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', qo.id,
            'optionIndex', qo.option_index,
            'optionText', qo.option_text
          )
          ORDER BY qo.option_index
        ) FILTER (WHERE qo.id IS NOT NULL),
        '[]'::jsonb
      ) AS options,
      mt.id AS mock_test_id_ref,
      mt.name AS mock_test_name,
      c.id AS cluster_id,
      c.name AS cluster_name
    FROM questions q
    JOIN mock_tests mt ON mt.id = q.mock_test_id
    JOIN clusters c ON c.id = mt.cluster_id
    LEFT JOIN question_options qo ON qo.question_id = q.id
    WHERE ${whereSql}
      ${cursorSql}
    GROUP BY q.id, mt.id, c.id
    ORDER BY ${sortMode.valueExpr} ${sortMode.direction}, q.id ASC
    LIMIT $${limitParamIndex}
    `,
    queryParams,
  );

  return { rows: result.rows, sortMode };
}

export async function countNeedsReview(
  workspaceId,
  { clusterId, mockTestId, maxConfidence, hasAiIssues } = {},
) {
  const { whereSql, params } = buildFilters(
    workspaceId,
    { clusterId, mockTestId, maxConfidence, hasAiIssues },
    2,
  );

  const result = await pool.query(
    `
    SELECT count(*)::INT AS count
    FROM questions q
    JOIN mock_tests mt ON mt.id = q.mock_test_id
    JOIN clusters c ON c.id = mt.cluster_id
    WHERE ${whereSql}
    `,
    params,
  );

  return result.rows[0].count;
}
