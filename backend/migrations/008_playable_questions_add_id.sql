-- playable_mock_test_questions exposed questionNo but never the question's
-- own id. That was fine while nothing consumed the view for anything but
-- display - but the new attempts flow needs to PUT an answer against a
-- specific question by its real id (see attempts.repository.js#upsertAnswer),
-- and questionNo alone isn't a usable key for that from the frontend.
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
  q.explanation
FROM questions q
ORDER BY q.mock_test_id, q.question_no;
