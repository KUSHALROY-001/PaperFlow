import { pool } from "../db/pool.js";

// Cross-cluster, cross-mock-test view over every question a workspace has
// ever extracted - deliberately its own domain (not folded into
// questions.repository.js) because its query shape is genuinely
// different from single-question CRUD: joined to mock_tests/clusters for
// display context, filtered on several optional dimensions at once, and
// keyset-paginated since a workspace's full question history (unlike any
// other list this app serves - a cluster's mock tests, a mock test's own
// questions) can realistically run into the thousands.
//
// Conditions are built up as a plain array and joined with AND, matching
// extraction-templates.repository.js#listAccessibleTemplates rather than
// a CASE-WHEN-per-column pattern - this codebase's own established way of
// doing an optional multi-filter SELECT (the CASE-WHEN/COALESCE shape
// elsewhere in this file's sibling repositories is for optional-field
// UPDATEs, a different problem).
export async function searchQuestions(
  workspaceId,
  {
    search,
    topic,
    subtopic,
    hasDiagram,
    status,
    questionType,
    clusterId,
    cursor, // { createdAt, id } | null - see question-bank.service.js for decoding
    limit,
  },
) {
  const conditions = ["q.workspace_id = $1"];
  const params = [workspaceId];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`q.question_text ILIKE $${params.length}`);
  }
  if (topic) {
    params.push(topic);
    conditions.push(`q.topic = $${params.length}`);
  }
  if (subtopic) {
    params.push(subtopic);
    conditions.push(`q.subtopic = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`q.status = $${params.length}`);
  }
  if (questionType) {
    params.push(questionType);
    conditions.push(`q.question_type = $${params.length}`);
  }
  if (clusterId) {
    params.push(clusterId);
    conditions.push(`c.id = $${params.length}`);
  }
  if (typeof hasDiagram === "boolean") {
    // Not a stored column - derived the same way the SELECT list below
    // does (EXISTS against question_assets) - repeated here rather than
    // filtered on the SELECT alias, since a plain alias isn't usable in
    // WHERE within the same query without wrapping this in a subquery/CTE
    // for what's otherwise a one-line condition.
    params.push(hasDiagram);
    conditions.push(
      `EXISTS (SELECT 1 FROM question_assets qa WHERE qa.question_id = q.id) = $${params.length}`,
    );
  }
  if (cursor) {
    params.push(cursor.createdAt, cursor.id);
    // Keyset (not OFFSET) pagination - stays a fast index scan on page 50
    // the same way it is on page 1, unlike OFFSET which gets slower the
    // deeper you page since Postgres still has to walk past every
    // skipped row. Tuple comparison matches the ORDER BY below exactly:
    // "everything strictly after this (created_at, id) pair in DESC
    // order" is that pair being LESS than the cursor's.
    conditions.push(
      `(q.created_at, q.id) < ($${params.length - 1}, $${params.length})`,
    );
  }

  params.push(limit);

  const result = await pool.query(
    `
    SELECT
      q.id,
      q.mock_test_id AS "mockTestId",
      q.question_no AS "questionNo",
      q.topic,
      q.subtopic,
      q.passage,
      q.question_text AS "text",
      q.explanation,
      q.question_type AS "questionType",
      q.correct_option_indexes AS "correctOptionIndexes",
      q.marks_per_correct AS "marksPerCorrect",
      q.negative_marks_per_wrong AS "negativeMarksPerWrong",
      q.status,
      q.confidence,
      q.created_at AS "createdAt",
      q.source_question_id AS "sourceQuestionId",
      c.id AS "clusterId",
      c.name AS "clusterName",
      mt.name AS "mockTestName",
      -- Phase 2: "used in N other tests" - a direct lookup on the
      -- source_question_id FK (questions_source_question_id_idx from
      -- migration 020 makes this an index scan, not a table scan,
      -- regardless of workspace size). DISTINCT on mock_test_id, not a
      -- plain count of copies, since two copies could in principle land
      -- in the SAME target mock test - "used in N tests" should count
      -- tests, not copy rows.
      (
        SELECT count(DISTINCT q2.mock_test_id)
        FROM questions q2
        WHERE q2.source_question_id = q.id
      ) AS "usedInCount",
      -- Phase 2: provenance the other direction - if THIS question is
      -- itself a copy, show what it was copied from ("Copied from Q12 in
      -- JECA Physics 2024"). Left-joined below; NULL on both when this
      -- question was never copied (the common case).
      sq.question_no AS "sourceQuestionNo",
      smt.name AS "sourceMockTestName",
      -- Phase 2: basic duplicate flag. Scoped to the SAME topic only (a
      -- workspace-wide text comparison would flag generic exam
      -- boilerplate - "Which of the following is true?" - across
      -- unrelated topics as "duplicates", which isn't useful). Uses
      -- similarity() as a plain function call rather than the trgm
      -- index-accelerated '%' operator deliberately: '%' respects the
      -- pg_trgm.similarity_threshold session GUC, and this repository
      -- uses pool.query() directly (no explicit per-request transaction)
      -- - a SET/SET LOCAL here would either leak onto whatever unrelated
      -- query next reuses that pooled connection (plain SET) or require
      -- wrapping this read-only search in a transaction just to scope a
      -- GUC (SET LOCAL), neither of which is worth it for a "basic"
      -- flagger. At workspace-realistic row counts, scoping to
      -- same-topic-only already bounds the inner scan enough that the
      -- lack of index accelerration here isn't a real cost - worth
      -- revisiting with the '%' operator + an explicit transaction if
      -- this ever shows up as slow in practice.
      CASE
        WHEN q.topic IS NULL THEN false
        ELSE EXISTS (
          SELECT 1
          FROM questions q3
          WHERE q3.workspace_id = q.workspace_id
            AND q3.topic = q.topic
            AND q3.id != q.id
            AND similarity(q3.question_text, q.question_text) > 0.45
        )
      END AS "isPossibleDuplicate",
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'optionIndex', qo.option_index,
              'optionText', qo.option_text
            )
            ORDER BY qo.option_index
          )
          FROM question_options qo
          WHERE qo.question_id = q.content_id
        ),
        '[]'::jsonb
      ) AS options
    FROM questions q
    JOIN mock_tests mt ON mt.id = q.mock_test_id
    JOIN clusters c ON c.id = mt.cluster_id
    LEFT JOIN questions sq ON sq.id = q.source_question_id
    LEFT JOIN mock_tests smt ON smt.id = sq.mock_test_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY q.created_at DESC, q.id DESC
    LIMIT $${params.length}
    `,
    params,
  );

  return result.rows;
}

// Powers the filter panel's topic dropdown. Cheap and small (distinct
// topic VALUES, not rows) even at a few thousand questions, so no index
// beyond the (workspace_id, topic) composite from migration 020 is
// needed - that index alone makes this a fast index-only-ish scan rather
// than a sequential one.
export async function listDistinctTopics(workspaceId) {
  const result = await pool.query(
    `
    SELECT DISTINCT topic
    FROM questions
    WHERE workspace_id = $1 AND topic IS NOT NULL
    ORDER BY topic ASC
    `,
    [workspaceId],
  );
  return result.rows.map((row) => row.topic);
}

// Just the DB half of a copy - question-bank.service.js owns the
// transaction wrapper, the target-mock-test ownership check, the next
// question_no computation, and the diagram asset clone (a filesystem
// operation this repository layer has no business doing). `client` is
// required (not optional-falls-back-to-pool like most read queries in
// this file) because the caller always runs this inside a transaction
// alongside that question_no computation - see the service for why.
export async function findQuestionWithOptionsById(
  client,
  questionId,
  workspaceId,
) {
  const questionResult = await client.query(
    `SELECT * FROM questions WHERE id = $1 AND workspace_id = $2`,
    [questionId, workspaceId],
  );
  const question = questionResult.rows[0];
  if (!question) return null;

  // question_options.question_id references question_contents(id)
  // (migration 030) - question.content_id, not questionId (the slot id
  // from the URL), is the right key here.
  const optionsResult = await client.query(
    `SELECT option_index, option_text FROM question_options WHERE question_id = $1 ORDER BY option_index ASC`,
    [question.content_id],
  );

  return { ...question, options: optionsResult.rows };
}

// Inserts a new SLOT in the target mock test pointing at the SOURCE
// question's EXISTING content_id - migration 030's whole point. No new
// question_contents row, no new question_options rows: the copy and the
// original are now two slots genuinely sharing one piece of storage, not
// two independent copies of the same text. (Editing either one later
// forks it back apart automatically - see questions.service.js
// #updateQuestion - so this sharing never silently corrupts either mock
// test's content.)
//
// status is ALWAYS 'needs_review' regardless of the source question's own
// status - a copy is landing in a different mock test's context (maybe a
// different template, different marking scheme, different reviewer) and
// should get its own fresh review pass rather than silently inheriting
// "approved" from a context that no longer applies. This is a SLOT-level
// field, so it's independent per copy even though the content is shared -
// exactly the split migration 030 was built for.
//
// marks_per_correct/negative_marks_per_wrong are deliberately left out of
// this INSERT (question_slots has no such columns post-030 - they live on
// question_contents now, and are shared along with everything else the
// content row carries). Previously this function set them NULL on the
// copy on purpose (see the old comment this replaces) so a copy fell back
// to the target mock test's own default marks rather than inheriting a
// source-mock-test-specific override; under sharing, that override now
// genuinely IS shared, same as topic/subtopic/passage/text/options - a
// deliberate consequence of "same content_id" meaning the same content in
// every sense, not a partial share. If a specific copy needs its own
// marking override, editing it will fork the content first, same as any
// other content edit.
export async function insertCopiedQuestion(
  client,
  { workspaceId, targetMockTestId, questionNo, source },
) {
  const result = await client.query(
    `
    INSERT INTO question_slots (
      workspace_id,
      mock_test_id,
      question_no,
      source_page,
      confidence,
      status,
      content_id,
      source_question_id
    )
    VALUES ($1, $2, $3, $4, $5, 'needs_review', $6, $7)
    RETURNING id
    `,
    [
      workspaceId,
      targetMockTestId,
      questionNo,
      // source_page intentionally NOT carried over - it refers to a page
      // number in the SOURCE mock test's own PDF, meaningless (and
      // actively misleading, if shown as "Page 4" next to a document that
      // isn't that PDF at all) in the target mock test's context.
      null,
      source.confidence,
      source.content_id,
      source.id,
    ],
  );

  // Re-read through the compatibility view so the caller gets back the
  // exact same shape every other question-returning function in this
  // codebase promises - topic/subtopic/passage/text/options/has_code/etc.
  // all resolve correctly through the shared content_id, no separate
  // options fetch needed here.
  const created = await client.query(`SELECT * FROM questions WHERE id = $1`, [
    result.rows[0].id,
  ]);
  return created.rows[0];
}

// Locks the target mock test's row for the duration of the transaction so
// two concurrent copies into the SAME mock test can't both compute the
// same "next" question_no and collide against the (mock_test_id,
// question_no) UNIQUE constraint - a real, if narrow, race the naive
// "SELECT MAX(question_no)+1" alone wouldn't close.
export async function lockMockTestForCopy(client, mockTestId, workspaceId) {
  const result = await client.query(
    `SELECT id FROM mock_tests WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
    [mockTestId, workspaceId],
  );
  return result.rows[0] || null;
}

export async function nextQuestionNo(client, mockTestId) {
  const result = await client.query(
    `SELECT COALESCE(MAX(question_no), 0) + 1 AS next FROM questions WHERE mock_test_id = $1`,
    [mockTestId],
  );
  return result.rows[0].next;
}
