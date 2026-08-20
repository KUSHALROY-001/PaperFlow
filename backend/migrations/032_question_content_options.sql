-- Phase 1: keep question_options as a safety copy, but make
-- question_contents the source of truth the application reads/writes.

ALTER TABLE question_contents
  ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'question_contents_options_is_array'
      AND conrelid = 'question_contents'::regclass
  ) THEN
    ALTER TABLE question_contents
      ADD CONSTRAINT question_contents_options_is_array
      CHECK (jsonb_typeof(options) = 'array');
  END IF;
END $$;

UPDATE question_contents qc
SET options = COALESCE(
  (
    SELECT jsonb_agg(qo.option_text ORDER BY qo.option_index)
    FROM question_options qo
    WHERE qo.question_id = qc.id
  ),
  '[]'::jsonb
)
WHERE qc.options = '[]'::jsonb;

DROP VIEW IF EXISTS playable_mock_test_questions;
DROP VIEW IF EXISTS questions;

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
  qc.options,
  qs.created_at,
  qs.updated_at,
  qs.source_question_id,
  qs.content_id
FROM question_slots qs
JOIN question_contents qc ON qc.id = qs.content_id;

CREATE VIEW playable_mock_test_questions AS
SELECT
  qs.id AS "questionId",
  qs.mock_test_id,
  qs.question_no AS "questionNo",
  qc.topic,
  qc.subtopic,
  qc.passage,
  qc.question_text AS text,
  qc.options,
  to_jsonb(qc.correct_option_indexes) AS "correctOptionIndex",
  qc.question_type AS "questionType",
  qc.explanation
FROM question_slots qs
JOIN question_contents qc ON qc.id = qs.content_id
WHERE qs.status <> 'rejected'
ORDER BY qs.mock_test_id, qs.question_no;
