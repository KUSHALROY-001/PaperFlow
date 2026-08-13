-- Phase 3 of the code-formatting fix: the live exam-taking screen
-- (attempts.service.js#startAttempt -> mock-tests.repository.js
-- #listPlayableQuestions) reads from this view, not from `questions`
-- directly, so 012_questions_code_formatting.sql's new has_code/
-- code_language columns need to be added here too or the exam-taking
-- screen would silently never see them regardless of what's in the table.
--
-- Same camelCase convention this view already uses for every other
-- JS-facing column (questionId, questionNo, correctOptionIndex,
-- questionType) - unlike questions.* itself, or the editor/output/review
-- endpoint (mock-tests.repository.js#listQuestionsWithOptions, which is a
-- plain `SELECT q.*` and stays snake_case), this view's whole point is to
-- shape a row the frontend can consume directly.
DROP VIEW IF EXISTS playable_mock_test_questions;

CREATE VIEW playable_mock_test_questions AS
SELECT
  q.id AS "questionId",
  q.mock_test_id,
  q.question_no AS "questionNo",
  q.topic,
  q.question_text AS text,
  COALESCE(
    (
      SELECT jsonb_agg(qo.option_text ORDER BY qo.option_index)
      FROM question_options qo
      WHERE qo.question_id = q.id
    ),
    '[]'::jsonb
  ) AS options,
  to_jsonb(q.correct_option_indexes) AS "correctOptionIndex",
  q.question_type AS "questionType",
  q.explanation,
  q.has_code AS "hasCode",
  q.code_language AS "codeLanguage"
FROM questions q
ORDER BY q.mock_test_id, q.question_no;
