-- Phase 0 of written-answer support (fill-blank / short-answer /
-- long-answer / numerical), continued from 049_written_answer_question_types.sql
-- (that migration only added the enum values; this one is what actually
-- uses them, which is why it has to be a separate file/transaction).

-- ============================================================
-- 1. question_contents: type-specific answer-key columns.
--    correct_option_indexes/options stay exactly as they are for
--    'single'/'multi' (MCQ) - these are new, nullable columns that only
--    apply to the new types, same "populated only when relevant" shape
--    marks_per_correct/negative_marks_per_wrong already use.
-- ============================================================
ALTER TABLE question_contents
  ALTER COLUMN correct_option_indexes DROP NOT NULL,
  -- fill_blank: every acceptable answer, per blank, in order - e.g. for a
  -- question with two blanks, [["Delhi","New Delhi"],["1911"]].
  ADD COLUMN accepted_answers JSONB,
  -- short_answer/long_answer: structured rubric the AI (or a teacher, at
  -- authoring time) can grade against point-by-point - an array of
  -- {point, weight} objects. Falls back to a single free-text
  -- expected_answer when the source paper doesn't give a detailed enough
  -- marking scheme to derive individual rubric points from (same
  -- "leave the detailed field null and use the plain fallback" shape as
  -- settings.marking_scheme already uses at the template level).
  ADD COLUMN grading_rubric JSONB,
  ADD COLUMN expected_answer TEXT,
  -- long_answer: from the paper's own instructions ("answer in about 150
  -- words") when stated - purely informational for the student-facing
  -- word-limit counter, never enforced server-side.
  ADD COLUMN answer_word_limit INT,
  ADD COLUMN numeric_answer NUMERIC,
  ADD COLUMN numeric_tolerance NUMERIC;

-- Defense in depth, same rigor as question_contents_options_is_array
-- (032_question_content_options.sql): malformed shape is rejected at the
-- DB layer regardless of which application code path wrote it, rather
-- than relying solely on the type-shape CHECK further down (which only
-- checks presence, not JSON shape).
ALTER TABLE question_contents
  ADD CONSTRAINT question_contents_accepted_answers_is_array
    CHECK (accepted_answers IS NULL OR jsonb_typeof(accepted_answers) = 'array'),
  ADD CONSTRAINT question_contents_grading_rubric_is_array
    CHECK (grading_rubric IS NULL OR jsonb_typeof(grading_rubric) = 'array'),
  ADD CONSTRAINT question_contents_answer_word_limit_nonneg
    CHECK (answer_word_limit IS NULL OR answer_word_limit > 0),
  ADD CONSTRAINT question_contents_numeric_tolerance_nonneg
    CHECK (numeric_tolerance IS NULL OR numeric_tolerance >= 0);

-- The old blanket "every question is MCQ" check
-- (CHECK (cardinality(correct_option_indexes) > 0), unnamed at creation
-- in 030_shared_question_content.sql - Postgres auto-names a single-
-- column unnamed CHECK as <table>_<column>_check, confirmed against the
-- actual constraint name in a real run of this migration, not guessed)
-- is replaced with one that only requires an MCQ answer key for the MCQ
-- types, and the matching answer-key field for each new type.
--
-- The explicit "IS NOT NULL AND" before each cardinality()/length() call
-- below is load-bearing, not defensive filler: cardinality(NULL) and
-- jsonb_array_length(NULL) both evaluate to NULL, not 0, and a CHECK
-- constraint treats a NULL result as PASSING (only an explicit FALSE
-- fails it) - so without the explicit NULL check, a 'single'/'multi' row
-- with a NULL correct_option_indexes (now possible, since the NOT NULL
-- was just dropped above) would silently satisfy this constraint instead
-- of being rejected, defeating the entire point of adding it.
ALTER TABLE question_contents
  DROP CONSTRAINT IF EXISTS question_contents_correct_option_indexes_check;

ALTER TABLE question_contents
  ADD CONSTRAINT question_contents_type_shape CHECK (
    (
      question_type IN ('single', 'multi')
      AND correct_option_indexes IS NOT NULL
      AND cardinality(correct_option_indexes) > 0
    )
    OR (
      question_type = 'fill_blank'
      AND accepted_answers IS NOT NULL
      AND jsonb_array_length(accepted_answers) > 0
    )
    OR question_type IN ('short_answer', 'long_answer')
    OR (question_type = 'numerical' AND numeric_answer IS NOT NULL)
  );

-- ============================================================
-- 2. exam_answers: where a student's own written answer and its grading
--    state live. marks_awarded (already on this table) stays the one
--    field every other part of the app reads for "this question's
--    score" - it's set immediately for MCQ/fill-blank/numerical, same as
--    today, and only once for short/long answer once grading (AI or a
--    teacher override) actually completes; these new columns are the
--    grading *process* detail behind that, not a second source of truth.
-- ============================================================
DO $$ BEGIN
  CREATE TYPE grading_status AS ENUM (
    'not_applicable',
    'pending_grading',
    'ai_graded',
    'teacher_reviewed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE exam_answers
  ADD COLUMN answer_text TEXT,
  -- 'not_applicable' default matches every existing row and every
  -- MCQ/fill-blank/numerical answer going forward - those score
  -- immediately, same as today, and never enter the grading queue at
  -- all. Only short_answer/long_answer submissions get set to
  -- 'pending_grading' by the application at insert time (Phase 2).
  ADD COLUMN grading_status grading_status NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN ai_suggested_marks NUMERIC(6,2),
  ADD COLUMN ai_rubric_breakdown JSONB,
  ADD COLUMN ai_reasoning TEXT;

ALTER TABLE exam_answers
  ADD CONSTRAINT exam_answers_ai_suggested_marks_nonneg
    CHECK (ai_suggested_marks IS NULL OR ai_suggested_marks >= 0),
  ADD CONSTRAINT exam_answers_ai_rubric_breakdown_is_array
    CHECK (ai_rubric_breakdown IS NULL OR jsonb_typeof(ai_rubric_breakdown) = 'array');

CREATE INDEX IF NOT EXISTS idx_exam_answers_grading_status
  ON exam_answers(grading_status)
  WHERE grading_status = 'pending_grading';

-- ============================================================
-- 3. attempt_grading_batches: one row per ~12-question chunk of an
--    attempt's written answers sent to the AI grader in a single call
--    (see the batching design in docs/engineering-log - one call per
--    attempt in the common case, chunked only as a safety valve for
--    attempts with unusually many written questions). Deliberately its
--    own table rather than reusing processing_jobs: that table is keyed
--    to mock_test_id/uploaded_file_id for the extraction pipeline and
--    doesn't fit an attempt-scoped, multi-chunk job well. Mirrors
--    processing_jobs/processing_job_events' status-tracking shape
--    instead, including reusing the same processing_status enum
--    (queued/running/completed/failed/cancelled) - a grading batch's
--    lifecycle is the same shape as an extraction job's, just scoped to
--    an attempt instead of a mock test.
-- ============================================================
CREATE TABLE attempt_grading_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL CHECK (chunk_index >= 0),
  status processing_status NOT NULL DEFAULT 'queued',
  question_ids UUID[] NOT NULL CHECK (cardinality(question_ids) > 0),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, chunk_index)
);

CREATE INDEX idx_attempt_grading_batches_attempt_id
  ON attempt_grading_batches(attempt_id);
CREATE INDEX idx_attempt_grading_batches_status
  ON attempt_grading_batches(status)
  WHERE status IN ('queued', 'running');

DROP TRIGGER IF EXISTS trg_attempt_grading_batches_updated_at ON attempt_grading_batches;
CREATE TRIGGER trg_attempt_grading_batches_updated_at
BEFORE UPDATE ON attempt_grading_batches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. Expose the new question_contents columns through the two views the
--    rest of the app actually reads questions through (question_contents
--    itself is never queried directly outside the repository layer that
--    owns it) - same reasoning as every prior migration that added a
--    question_contents column (032, 043): a column the views don't
--    expose is invisible to the rest of the app no matter what's in the
--    table.
--
--    playable_mock_test_questions already exposes the MCQ answer key
--    (correctOptionIndex) despite being the STUDENT-facing playable-
--    question view - the service layer (mock-tests.service.js's
--    clientQuestions mapping) is what strips answer-key fields before
--    anything reaches the browser, not this view. The new answer-key
--    columns follow that same layering rather than being withheld here.
-- ============================================================
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
  qc.accepted_answers,
  qc.grading_rubric,
  qc.expected_answer,
  qc.answer_word_limit,
  qc.numeric_answer,
  qc.numeric_tolerance,
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
  qc.accepted_answers AS "acceptedAnswers",
  qc.grading_rubric AS "gradingRubric",
  qc.expected_answer AS "expectedAnswer",
  qc.answer_word_limit AS "answerWordLimit",
  qc.numeric_answer AS "numericAnswer",
  qc.numeric_tolerance AS "numericTolerance",
  qc.question_type AS "questionType",
  qc.explanation,
  qc.marks_per_correct AS "marksPerCorrect",
  qc.negative_marks_per_wrong AS "negativeMarksPerWrong"
FROM question_slots qs
JOIN question_contents qc ON qc.id = qs.content_id
WHERE qs.status <> 'rejected'
ORDER BY qs.mock_test_id, qs.question_no;
