-- Drop views that depend on has_code, code_language, code_snippet
DROP VIEW IF EXISTS playable_mock_test_questions;
DROP VIEW IF EXISTS questions;

-- Drop obsolete code fields from question_contents table
ALTER TABLE question_contents
  DROP COLUMN has_code,
  DROP COLUMN code_language,
  DROP COLUMN code_snippet;

-- Recreate questions compatibility view without code fields
CREATE VIEW questions AS
SELECT
  qs.id,
  qs.workspace_id,
  qs.mock_test_id,
  qs.question_no,
  qc.topic,
  qc.subtopic,
  qc.passage,
  qc.question_text,
  qc.explanation,
  qc.question_type,
  qc.correct_option_indexes,
  qc.marks_per_correct,
  qc.negative_marks_per_wrong,
  qs.source_page,
  qs.confidence,
  qs.status,
  qc.metadata,
  qs.created_at,
  qs.updated_at,
  qs.source_question_id,
  qs.content_id
FROM question_slots qs
JOIN question_contents qc ON qc.id = qs.content_id;

-- Recreate playable_mock_test_questions view without code fields
CREATE VIEW playable_mock_test_questions AS
SELECT
  qs.id AS "questionId",
  qs.mock_test_id,
  qs.question_no AS "questionNo",
  qc.topic,
  qc.subtopic,
  qc.passage,
  qc.question_text AS text,
  COALESCE(
    (
      SELECT jsonb_agg(qo.option_text ORDER BY qo.option_index)
      FROM question_options qo
      WHERE qo.question_id = qc.id
    ),
    '[]'::jsonb
  ) AS options,
  to_jsonb(qc.correct_option_indexes) AS "correctOptionIndex",
  qc.question_type AS "questionType",
  qc.explanation
FROM question_slots qs
JOIN question_contents qc ON qc.id = qs.content_id
WHERE qs.status <> 'rejected'
ORDER BY qs.mock_test_id, qs.question_no;
