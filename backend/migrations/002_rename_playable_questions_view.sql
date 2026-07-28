-- practice_jeca_questions was named after the first exam it was tested with,
-- but it is fully generic: it shapes questions for ANY mock test for the
-- play/attempt flow (see mock-tests.repository.js#listPlayableQuestions,
-- which already treats it as generic). Renaming it before more code grows
-- around the misleading name.

DROP VIEW IF EXISTS practice_jeca_questions;

CREATE OR REPLACE VIEW playable_mock_test_questions AS
SELECT
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
  q.explanation
FROM questions q
ORDER BY q.mock_test_id, q.question_no;
