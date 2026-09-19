-- Reprocessing a mock test used to delete every question_slots row for it
-- up front, before the new extraction had produced a single replacement
-- question (see worker.py#process_job's old delete_existing_questions call
-- at job start) - so the Review tab went empty the instant reprocessing
-- began, and a cancelled reprocess left it that way permanently. Fixed
-- alongside this migration by streaming replacements per question_no
-- instead (upsert_question_batch already existed for this - the fix was
-- mostly about no longer bypassing it with a blanket delete), so an old
-- question's content now survives untouched until the run actually
-- produces its replacement, and a cancelled run keeps whatever it hasn't
-- reached yet exactly as it was.
--
-- That raises the question this migration exists to answer: if the new
-- extraction genuinely finds FEWER questions than before (a 50-question
-- paper's reprocess only recovers 40), slots 41-50 are never touched by
-- anything and would otherwise sit around unchanged forever with no
-- signal that the latest reprocess didn't confirm they still belong in
-- the paper. review_flags is a per-SLOT (deliberately not on
-- question_contents - the same content_id can be shared with a different
-- mock test's slot via question-bank copying or a duplicate merge, so a
-- flag about THIS mock test's reprocess must never land somewhere another
-- mock test's slot would also see it) JSONB bag the worker stamps on
-- exactly those orphaned slots, so the Review tab can surface them for a
-- human decision instead of either silently keeping or deleting them.
ALTER TABLE question_slots
  ADD COLUMN review_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

-- The questions view (most recently recreated in 050) must expose this
-- for the Node API's existing `SELECT q.* FROM questions` call sites
-- (mock-tests.repository.js#listQuestionsWithOptions, in particular) to
-- pick it up with no further repository changes.
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
  qs.content_id,
  qs.review_flags
FROM question_slots qs
JOIN question_contents qc ON qc.id = qs.content_id;
