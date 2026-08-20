-- playable_mock_test_questions never exposed subtopic or passage - every
-- redefinition since 002 (008, 013, 017, 027) added other fields
-- (questionId, code fields, the 'rejected' status filter) but these two
-- were never part of it, so a test-taker never saw either even though
-- both columns have existed on `questions` since 001_initial_schema.sql.
--
-- explanation is already selected here (since 013) and deliberately
-- stays unused by the mock-session frontend (SessionQuestionView.jsx) -
-- that's a frontend rendering choice, not something this view needs to
-- gate; adding subtopic/passage here doesn't change that.
DROP VIEW IF EXISTS playable_mock_test_questions;

CREATE VIEW playable_mock_test_questions AS
SELECT
  q.id AS "questionId",
  q.mock_test_id,
  q.question_no AS "questionNo",
  q.topic,
  q.subtopic,
  q.passage,
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
  q.code_language AS "codeLanguage",
  q.code_snippet AS "codeSnippet"
FROM questions q
WHERE q.status <> 'rejected'
ORDER BY q.mock_test_id, q.question_no;
