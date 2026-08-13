import { pool } from "../db/pool.js";

// `ON CONFLICT ... DO NOTHING` targets the partial unique index added in
// migration 011 (one in_progress attempt per workspace/mock test/user).
// It's a no-op for guest inserts (user_id IS NULL never matches that
// index's predicate) and returns no row when a concurrent request already
// won the race for a logged-in user - callers must re-select in that case
// (see startAttempt in attempts.service.js). This closes the race where
// two near-simultaneous start calls for the same user both pass the
// service's "reuse if one exists" SELECT before either INSERT commits.
export async function insertAttempt(
  client,
  { workspaceId, mockTestId, userId, totalQuestions, metadata },
) {
  const result = await client.query(
    `
    INSERT INTO exam_attempts (
      workspace_id,
      mock_test_id,
      user_id,
      status,
      total_questions,
      metadata
    )
    VALUES ($1, $2, $3, 'in_progress', $4, $5)
    ON CONFLICT (workspace_id, mock_test_id, user_id)
      WHERE status = 'in_progress' AND user_id IS NOT NULL
      DO NOTHING
    RETURNING *
    `,
    [workspaceId, mockTestId, userId, totalQuestions, metadata || {}],
  );

  return result.rows[0] || null;
}

export async function findAttemptById(attemptId, workspaceId) {
  const result = await pool.query(
    `
    SELECT ea.*, mt.name AS mock_test_name, mt.duration_minutes, mt.status AS mock_test_status
    FROM exam_attempts ea
    JOIN mock_tests mt ON mt.id = ea.mock_test_id
    WHERE ea.id = $1
      AND ea.workspace_id = $2
    `,
    [attemptId, workspaceId],
  );

  return result.rows[0] || null;
}

// Same shape as findAttemptById above, but scoped by ownership instead of
// workspace - used for a logged-in user looking at their OWN attempt (My
// Results expand-to-review, and the review right after a member submits
// their own test). Unlike a guest's shared-link attempt, a member's own
// attempt has no meaningful "current workspace" once My Results went
// cross-workspace (see listAttemptsForUser) - a claimed result can belong
// to a workspace this user isn't even a member of, so workspace_id is the
// wrong thing to scope by here; user_id is the only identifier that's
// always correct.
export async function findAttemptByIdForUser(attemptId, userId) {
  const result = await pool.query(
    `
    SELECT ea.*, mt.name AS mock_test_name, mt.duration_minutes, mt.status AS mock_test_status
    FROM exam_attempts ea
    JOIN mock_tests mt ON mt.id = ea.mock_test_id
    WHERE ea.id = $1
      AND ea.user_id = $2
    `,
    [attemptId, userId],
  );

  return result.rows[0] || null;
}

// Locks the attempt row for update within a transaction - used before
// submit/answer-save so two concurrent requests for the same attempt
// (e.g. a double-click submit) can't both proceed against a stale status.
export async function findAttemptForUpdate(client, attemptId, workspaceId) {
  const result = await client.query(
    `
    SELECT *
    FROM exam_attempts
    WHERE id = $1
      AND workspace_id = $2
    FOR UPDATE
    `,
    [attemptId, workspaceId],
  );

  return result.rows[0] || null;
}

// "My Results" - a personal, cross-workspace history of everything this
// user owns (their own workspace attempts, plus any anonymous shared-link
// attempts they've claimed after the fact - see claimAttempt below).
// Deliberately NOT scoped to a single workspace_id: a claimed guest
// attempt may belong to a workspace this user isn't even a member of.
// Must only ever return attempts owned by this exact logged-in user -
// guest/shared-link attempts (user_id IS NULL) belong to the mock test's
// Submissions view (see listAllAttemptsForMockTest), not here - do not
// add an `OR ea.user_id IS NULL` fallback to this query.
export async function listAttemptsForUser(userId) {
  const result = await pool.query(
    `
    SELECT
      ea.*,
      mt.name AS mock_test_name,
      mt.duration_minutes
    FROM exam_attempts ea
    JOIN mock_tests mt ON mt.id = ea.mock_test_id
    WHERE ea.user_id = $1
      AND ea.status = 'submitted'
    ORDER BY ea.submitted_at DESC, ea.started_at DESC
    `,
    [userId],
  );

  return result.rows;
}

// Links a previously-anonymous, already-submitted shared-link attempt to a
// user account ("save my result" after the fact). All four conditions are
// enforced in the WHERE clause so a single matched row is proof the claim
// is valid - no separate read-then-write race:
//   - mock_test_id must match the mock test the given share token actually
//     resolves to (caller passes it in, resolved server-side from the
//     token - never trust a client-supplied mockTestId here)
//   - user_id IS NULL: can only claim an attempt nobody owns yet, so this
//     can never hijack someone else's already-claimed result
//   - status = 'submitted': never claim (or thereby appear to "resume")
//     an in-progress attempt
//   - metadata->>'shareToken' must match: the attempt must have actually
//     been started through this exact share link, not just any attempt
//     that happens to sit on the same mock test
export async function claimAttempt({
  attemptId,
  mockTestId,
  shareToken,
  userId,
}) {
  const result = await pool.query(
    `
    UPDATE exam_attempts
    SET user_id = $1
    WHERE id = $2
      AND mock_test_id = $3
      AND user_id IS NULL
      AND status = 'submitted'
      AND metadata->>'shareToken' = $4
    RETURNING *
    `,
    [userId, attemptId, mockTestId, shareToken],
  );

  return result.rows[0] || null;
}

export async function listAttemptsForMockTest(mockTestId, workspaceId, userId) {
  const result = await pool.query(
    `
    SELECT ea.*
    FROM exam_attempts ea
    WHERE ea.mock_test_id = $1
      AND ea.workspace_id = $2
      AND ea.user_id = $3
    ORDER BY ea.started_at DESC
    `,
    [mockTestId, workspaceId, userId],
  );

  return result.rows;
}

/*
 * Unlike listAttemptsForMockTest above (scoped to one user's own
 * attempts), this returns EVERY attempt on a mock test - both workspace
 * members' own attempts AND anonymous shared-link/guest attempts
 * (user_id IS NULL, guest's display name stored in metadata->guestName
 * at creation - see shared.service.js#startSharedAttempt). This is what
 * backs the mock-test owner's "who took this and how did they do"
 * Submissions view - callers MUST verify the mock test belongs to
 * workspaceId themselves first (see attempts.service.js), the same
 * convention shared.service.js already uses for share-link management.
 */
export async function listAllAttemptsForMockTest(mockTestId, workspaceId) {
  const result = await pool.query(
    `
    SELECT ea.*, u.name AS user_name, u.email AS user_email,
      -- ea.user_id being set is NOT the same as "is a member of this
      -- workspace": claimAttempt (see attempts.repository.js#claimAttempt)
      -- lets ANY authenticated account attach itself to a guest attempt,
      -- regardless of workspace membership. Only a matching
      -- workspace_members row proves this person actually belongs here.
      (wm.id IS NOT NULL) AS is_member
    FROM exam_attempts ea
    LEFT JOIN users u ON u.id = ea.user_id
    LEFT JOIN workspace_members wm
      ON wm.user_id = ea.user_id AND wm.workspace_id = ea.workspace_id
    WHERE ea.mock_test_id = $1
      AND ea.workspace_id = $2
    ORDER BY ea.started_at DESC
    `,
    [mockTestId, workspaceId],
  );

  return result.rows;
}

export async function upsertAnswer(
  client,
  { attemptId, questionId, selectedOptionIndexes },
) {
  const result = await client.query(
    `
    INSERT INTO exam_answers (attempt_id, question_id, selected_option_indexes, answered_at)
    VALUES ($1, $2, $3, now())
    ON CONFLICT (attempt_id, question_id)
    DO UPDATE SET
      selected_option_indexes = EXCLUDED.selected_option_indexes,
      answered_at = now()
    RETURNING *
    `,
    [attemptId, questionId, selectedOptionIndexes],
  );

  return result.rows[0];
}

export async function listAnswersForAttempt(attemptId) {
  const result = await pool.query(
    "SELECT * FROM exam_answers WHERE attempt_id = $1",
    [attemptId],
  );

  return result.rows;
}

// Full review shape: every question in the mock test, left-joined against
// this attempt's answer (so unattempted questions still show up with a
// null answer instead of being silently missing from the review).
export async function listQuestionsWithAnswersForAttempt(
  attemptId,
  mockTestId,
) {
  const result = await pool.query(
    `
    SELECT
      q.id AS question_id,
      q.question_no,
      q.topic,
      q.question_text,
      q.explanation,
      q.question_type,
      q.correct_option_indexes,
      q.has_code,
      q.code_language,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object('optionIndex', qo.option_index, 'optionText', qo.option_text)
            ORDER BY qo.option_index
          )
          FROM question_options qo
          WHERE qo.question_id = q.id
        ),
        '[]'::jsonb
      ) AS options,
      ea.selected_option_indexes,
      ea.is_correct,
      ea.marks_awarded
    FROM questions q
    LEFT JOIN exam_answers ea ON ea.question_id = q.id AND ea.attempt_id = $1
    WHERE q.mock_test_id = $2
    ORDER BY q.question_no ASC
    `,
    [attemptId, mockTestId],
  );

  return result.rows;
}

// Scoring inputs only - just what's needed to grade each answer, joined
// against this attempt's existing answers.
export async function listQuestionsForScoring(mockTestId, attemptId) {
  const result = await pool.query(
    `
    SELECT
      q.id AS question_id,
      q.correct_option_indexes,
      q.marks_per_correct AS question_marks_per_correct,
      q.negative_marks_per_wrong AS question_negative_marks_per_wrong,
      ea.selected_option_indexes
    FROM questions q
    LEFT JOIN exam_answers ea ON ea.question_id = q.id AND ea.attempt_id = $2
    WHERE q.mock_test_id = $1
    `,
    [mockTestId, attemptId],
  );

  return result.rows;
}

export async function updateAnswerScore(
  client,
  { attemptId, questionId, isCorrect, marksAwarded },
) {
  await client.query(
    `
    UPDATE exam_answers
    SET is_correct = $3,
        marks_awarded = $4
    WHERE attempt_id = $1
      AND question_id = $2
    `,
    [attemptId, questionId, isCorrect, marksAwarded],
  );
}

export async function finalizeAttempt(
  client,
  {
    attemptId,
    status,
    attemptedCount,
    correctCount,
    wrongCount,
    unattemptedCount,
    score,
  },
) {
  const result = await client.query(
    `
    UPDATE exam_attempts
    SET status = $2::attempt_status,
        submitted_at = CASE WHEN $2::attempt_status = 'submitted'::attempt_status THEN now() ELSE submitted_at END,
        attempted_count = $3,
        correct_count = $4,
        wrong_count = $5,
        unattempted_count = $6,
        score = $7
    WHERE id = $1
    RETURNING *
    `,
    [
      attemptId,
      status,
      attemptedCount,
      correctCount,
      wrongCount,
      unattemptedCount,
      score,
    ],
  );

  return result.rows[0];
}

// Finds this exact identity's own in-progress attempt to resume, if any.
// For a logged-in user that's user_id = $3; for an anonymous guest
// (userId null) it's specifically an attempt that is ALSO anonymous - never
// falls back to "any in-progress attempt on this mock test regardless of
// owner", which would incorrectly resume a stranger's attempt (a logged-in
// user picking up a guest's session, or one guest picking up another's).
export async function findActiveAttemptForUser(
  client,
  { mockTestId, workspaceId, userId },
) {
  const result = await client.query(
    `
    SELECT *
    FROM exam_attempts
    WHERE mock_test_id = $1
      AND workspace_id = $2
      AND ${userId ? "user_id = $3" : "user_id IS NULL"}
      AND status = 'in_progress'
    ORDER BY started_at DESC
    LIMIT 1
    FOR UPDATE
    `,
    userId ? [mockTestId, workspaceId, userId] : [mockTestId, workspaceId],
  );

  return result.rows[0] || null;
}

export async function findQuestionMockTestId(questionId) {
  const result = await pool.query(
    "SELECT mock_test_id FROM questions WHERE id = $1",
    [questionId],
  );

  return result.rows[0]?.mock_test_id || null;
}

export async function abandonAttempt(attemptId, workspaceId) {
  const result = await pool.query(
    `
    UPDATE exam_attempts
    SET status = 'abandoned'
    WHERE id = $1
      AND workspace_id = $2
      AND status = 'in_progress'
    RETURNING *
    `,
    [attemptId, workspaceId],
  );

  return result.rows[0] || null;
}

// My Results self-delete only (the Submissions tab dropped delete
// entirely - see SubmissionCard.jsx). Scoped strictly by ownership: a
// claimed attempt can belong to a workspace this user isn't a member of,
// so workspace_id isn't a safe or even reliably correct scope here -
// user_id is the only thing that's always both required and sufficient.
export async function deleteAttempt(attemptId, userId) {
  const result = await pool.query(
    `
    DELETE FROM exam_attempts
    WHERE id = $1 AND user_id = $2
    RETURNING *
    `,
    [attemptId, userId],
  );

  return result.rows[0] || null;
}
