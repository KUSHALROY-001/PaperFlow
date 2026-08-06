import { pool } from "../db/pool.js";

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
    RETURNING *
    `,
    [workspaceId, mockTestId, userId, totalQuestions, metadata || {}],
  );

  return result.rows[0];
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

export async function listAttemptsForUser(userId, workspaceId) {
  const result = await pool.query(
    `
    SELECT
      ea.*,
      mt.name AS mock_test_name,
      mt.duration_minutes
    FROM exam_attempts ea
    JOIN mock_tests mt ON mt.id = ea.mock_test_id
    WHERE ea.workspace_id = $1
      AND (ea.user_id = $2 OR ($2::uuid IS NULL AND ea.user_id IS NULL) OR ea.user_id IS NULL)
      AND ea.status = 'submitted'
    ORDER BY ea.submitted_at DESC, ea.started_at DESC
    `,
    [workspaceId, userId],
  );

  return result.rows;
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
      AND (user_id = $3 OR ($3::uuid IS NULL AND user_id IS NULL) OR user_id IS NULL)
      AND status = 'in_progress'
    ORDER BY started_at DESC
    LIMIT 1
    FOR UPDATE
    `,
    [mockTestId, workspaceId, userId || null],
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

export async function deleteAttempt(attemptId, workspaceId) {
  const result = await pool.query(
    `
    DELETE FROM exam_attempts
    WHERE id = $1 AND workspace_id = $2
    RETURNING *
    `,
    [attemptId, workspaceId],
  );

  return result.rows[0] || null;
}
