-- Pending AI grading must leave marks_awarded unset until the worker
-- writes the awarded value. The column was NOT NULL DEFAULT 0 from
-- 001_initial_schema; markAnswerPendingGrading sets it to NULL and
-- Postgres rejects that with 23502 (surfaced as 400 "A required field
-- is missing"). Drop the NOT NULL; keep DEFAULT 0 for rows that never
-- go through the pending path.
ALTER TABLE exam_answers
  ALTER COLUMN marks_awarded DROP NOT NULL;
