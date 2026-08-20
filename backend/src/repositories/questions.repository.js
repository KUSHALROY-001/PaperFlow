import { pool } from "../db/pool.js";

export async function findMockTestForWorkspace(mockTestId, workspaceId) {
  const result = await pool.query(
    "SELECT id FROM mock_tests WHERE id = $1 AND workspace_id = $2",
    [mockTestId, workspaceId],
  );

  return result.rows[0] || null;
}

// Reads via the `questions` compatibility view (migration 028) - same
// shape as before the slot/content split, PLUS content_id, which callers
// now need to know whether this question's content is exclusive to it or
// shared with other mock tests' slots (see updateQuestion's fork-on-edit
// logic below).
export async function findQuestionById(questionId, workspaceId) {
  const result = await pool.query(
    "SELECT * FROM questions WHERE id = $1 AND workspace_id = $2",
    [questionId, workspaceId],
  );

  return result.rows[0] || null;
}

// contentId, not a slot's id - question_options.question_id references
// question_contents(id) as of migration 028 (see that migration's step 4
// comment for why the column itself wasn't renamed).
export async function listOptionsForQuestion(contentId) {
  const result = await pool.query(
    `
    SELECT id, option_index AS "optionIndex", option_text AS "optionText"
    FROM question_options
    WHERE question_id = $1
    ORDER BY option_index ASC
    `,
    [contentId],
  );

  return result.rows;
}

// How many slots (in this workspace or any other - content sharing is
// workspace-scoped already via question_contents.workspace_id, so this
// never needs an extra workspace filter) currently point at this content
// row. 1 means "exclusive to the caller's own slot", i.e. safe to edit
// in place; >1 means shared, and updateQuestion below must fork before
// writing.
export async function countSlotsForContent(client, contentId) {
  const result = await client.query(
    "SELECT count(*)::int AS count FROM question_slots WHERE content_id = $1",
    [contentId],
  );
  return result.rows[0].count;
}

export async function findContentById(client, contentId) {
  const result = await client.query(
    "SELECT * FROM question_contents WHERE id = $1",
    [contentId],
  );
  return result.rows[0] || null;
}

// Clones a content row verbatim into a brand-new one, used by
// updateQuestion's fork-on-edit path (the actual field changes are
// applied by a separate updateContent call right after, against the new
// row - keeping "clone" and "apply edits" as two small, clear steps
// rather than one INSERT ... SELECT with every field's CASE WHEN
// duplicated from updateContent below).
export async function cloneContent(client, contentId) {
  const result = await client.query(
    `
    INSERT INTO question_contents (
      workspace_id, topic, subtopic, passage, question_text, explanation,
      question_type, correct_option_indexes, marks_per_correct,
      negative_marks_per_wrong, has_code, code_language, code_snippet,
      metadata
    )
    SELECT
      workspace_id, topic, subtopic, passage, question_text, explanation,
      question_type, correct_option_indexes, marks_per_correct,
      negative_marks_per_wrong, has_code, code_language, code_snippet,
      metadata
    FROM question_contents
    WHERE id = $1
    RETURNING id
    `,
    [contentId],
  );
  return result.rows[0].id;
}

export async function cloneOptions(client, fromContentId, toContentId) {
  await client.query(
    `
    INSERT INTO question_options (question_id, option_index, option_text)
    SELECT $2, option_index, option_text
    FROM question_options
    WHERE question_id = $1
    `,
    [fromContentId, toContentId],
  );
}

export async function insertQuestionOption(
  client,
  { contentId, optionIndex, optionText },
) {
  await client.query(
    "INSERT INTO question_options (question_id, option_index, option_text) VALUES ($1, $2, $3)",
    [contentId, optionIndex, optionText],
  );
}

export async function deleteOptionsForContent(client, contentId) {
  await client.query("DELETE FROM question_options WHERE question_id = $1", [
    contentId,
  ]);
}

// Creates BOTH rows a brand-new (not copied, not forked) question needs -
// a question_contents row for the actual text/options/answer, and a
// question_slots row placing it at (mockTestId, questionNo). Content
// created this way starts exclusive to this one slot; it only becomes
// shared later, via duplicates.service.js's merge action or
// question-bank.service.js's copy action repointing another slot onto
// this same content_id.
export async function createQuestion(
  client,
  {
    workspaceId,
    mockTestId,
    questionNo,
    topic,
    subtopic,
    passage,
    questionText,
    explanation,
    questionType,
    correctOptionIndexes,
    marksPerCorrect,
    negativeMarksPerWrong,
    sourcePage,
    confidence,
    status,
    metadata,
  },
) {
  const contentResult = await client.query(
    `
    INSERT INTO question_contents (
      workspace_id, topic, subtopic, passage, question_text, explanation,
      question_type, correct_option_indexes, marks_per_correct,
      negative_marks_per_wrong, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::int[], $9, $10, $11)
    RETURNING id
    `,
    [
      workspaceId,
      topic,
      subtopic,
      passage,
      questionText,
      explanation,
      questionType,
      correctOptionIndexes,
      marksPerCorrect,
      negativeMarksPerWrong,
      metadata,
    ],
  );
  const contentId = contentResult.rows[0].id;

  const slotResult = await client.query(
    `
    INSERT INTO question_slots (
      workspace_id, mock_test_id, question_no, source_page, confidence,
      status, content_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
    `,
    [
      workspaceId,
      mockTestId,
      questionNo,
      sourcePage,
      confidence,
      status,
      contentId,
    ],
  );

  // Re-read through the compatibility view rather than hand-assembling
  // the return shape here, so callers get back exactly the same column
  // set findQuestionById/getQuestion already promise elsewhere in this
  // file - one source of truth for "what a question row looks like".
  const created = await client.query("SELECT * FROM questions WHERE id = $1", [
    slotResult.rows[0].id,
  ]);
  return created.rows[0];
}

// Fields that live on question_contents (the SHARED row) - a change to
// any of these is what triggers fork-on-edit in questions.service.js.
// Deliberately exported so the service layer's "does this update touch
// content at all" check and this file's own updateContent implementation
// can never drift apart into two different ideas of which fields count.
export const CONTENT_FIELDS = [
  "topic",
  "subtopic",
  "passage",
  "questionText",
  "explanation",
  "questionType",
  "correctOptionIndexes",
  "marksPerCorrect",
  "negativeMarksPerWrong",
  "metadata",
  "codeSnippet",
];

// In-place update of a content row - only ever called once
// questions.service.js has already established (via countSlotsForContent)
// that this content_id is exclusive to the slot being edited, or is the
// freshly-cloned row from a fork that just happened. Never called
// directly against a still-shared row.
export async function updateContent(client, contentId, fields) {
  const {
    topicProvided,
    topic,
    subtopicProvided,
    subtopic,
    passageProvided,
    passage,
    questionText,
    explanationProvided,
    explanation,
    questionType,
    correctOptionIndexes,
    marksPerCorrectProvided,
    marksPerCorrect,
    negativeMarksPerWrongProvided,
    negativeMarksPerWrong,
    metadata,
    codeSnippetProvided,
    codeSnippet,
  } = fields;

  const result = await client.query(
    `
    UPDATE question_contents
    SET
      topic = CASE WHEN $2::boolean THEN $3 ELSE topic END,
      subtopic = CASE WHEN $4::boolean THEN $5 ELSE subtopic END,
      passage = CASE WHEN $6::boolean THEN $7 ELSE passage END,
      question_text = COALESCE($8, question_text),
      explanation = CASE WHEN $9::boolean THEN $10 ELSE explanation END,
      question_type = COALESCE($11::question_type, question_type),
      correct_option_indexes = COALESCE($12::int[], correct_option_indexes),
      marks_per_correct = CASE WHEN $13::boolean THEN $14 ELSE marks_per_correct END,
      negative_marks_per_wrong = CASE WHEN $15::boolean THEN $16 ELSE negative_marks_per_wrong END,
      metadata = COALESCE($17, metadata),
      code_snippet = CASE WHEN $18::boolean THEN $19 ELSE code_snippet END
    WHERE id = $1
    RETURNING id
    `,
    [
      contentId,
      topicProvided,
      topic,
      subtopicProvided,
      subtopic,
      passageProvided,
      passage,
      questionText,
      explanationProvided,
      explanation,
      questionType,
      correctOptionIndexes,
      marksPerCorrectProvided,
      marksPerCorrect,
      negativeMarksPerWrongProvided,
      negativeMarksPerWrong,
      metadata,
      codeSnippetProvided,
      codeSnippet,
    ],
  );

  return result.rows[0] || null;
}

// Slot-only fields - questionNo/sourcePage/confidence/status never
// trigger forking, since they're already exclusive to this one slot by
// definition (that's the whole reason they live on question_slots and
// not question_contents). contentIdOverride is set by
// questions.service.js when a fork just happened, repointing this slot
// at its new, now-exclusive content row in the same UPDATE.
export async function updateSlot(
  client,
  slotId,
  workspaceId,
  {
    questionNo,
    sourcePageProvided,
    sourcePage,
    confidenceProvided,
    confidence,
    status,
    contentIdOverride,
  },
) {
  const result = await client.query(
    `
    UPDATE question_slots
    SET
      question_no = COALESCE($3, question_no),
      source_page = CASE WHEN $4::boolean THEN $5 ELSE source_page END,
      confidence = CASE WHEN $6::boolean THEN $7 ELSE confidence END,
      status = COALESCE($8::question_status, status),
      content_id = COALESCE($9, content_id)
    WHERE id = $1
      AND workspace_id = $2
    RETURNING id
    `,
    [
      slotId,
      workspaceId,
      questionNo,
      sourcePageProvided,
      sourcePage,
      confidenceProvided,
      confidence,
      status,
      contentIdOverride,
    ],
  );

  return result.rows[0] || null;
}

// Deletes only the SLOT - the content row it pointed at may still be in
// use by other mock tests' slots (that's the entire point of sharing),
// so it's never touched here. A content row this was the last slot for
// becomes orphaned rather than immediately reclaimed - the same
// conservative "don't auto-delete, a human can clean it up deliberately"
// stance 027's own commit message took for rejected question rows,
// rather than risking a delete racing some other in-flight transaction
// that's mid-fork off the same content row.
export async function deleteQuestion(questionId, workspaceId) {
  const result = await pool.query(
    "DELETE FROM question_slots WHERE id = $1 AND workspace_id = $2 RETURNING id",
    [questionId, workspaceId],
  );

  return result.rowCount > 0;
}

// Bulk approve/reject for the Review Queue's list view (Phase 3 - "these
// 10 are all obviously fine"). Scoped to `status = 'needs_review'` so a
// stale selection (e.g. someone else already decided one of these
// questions in another tab between page-load and this click) can't
// silently flip an already-approved/rejected question back and forth -
// those ids just don't come back in the result, and the caller can tell
// exactly which of its requested ids actually changed. status lives on
// question_slots (migration 028), not the questions view - writes go
// there directly.
export async function bulkUpdateStatus(questionIds, workspaceId, status) {
  const result = await pool.query(
    `
    UPDATE question_slots
    SET status = $1::question_status
    WHERE id = ANY($2::uuid[])
      AND workspace_id = $3
      AND status = 'needs_review'
    RETURNING id
    `,
    [status, questionIds, workspaceId],
  );

  return result.rows.map((row) => row.id);
}
