-- Questions not confirmed by a successful reprocess remain available to
-- editors in Review, but are no longer part of the live paper until an
-- editor explicitly restores them.

CREATE OR REPLACE FUNCTION refresh_mock_test_question_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE mock_tests
    SET total_questions = (
      SELECT count(*)::INT FROM question_slots
      WHERE mock_test_id = OLD.mock_test_id
        AND status <> 'rejected'
        AND review_flags->>'staleFromReprocess' IS DISTINCT FROM 'true'
    ) WHERE id = OLD.mock_test_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE mock_tests
    SET total_questions = (
      SELECT count(*)::INT FROM question_slots
      WHERE mock_test_id = NEW.mock_test_id
        AND status <> 'rejected'
        AND review_flags->>'staleFromReprocess' IS DISTINCT FROM 'true'
    ) WHERE id = NEW.mock_test_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- The original update trigger only listened for mock_test_id changes. A
-- reprocess changes review_flags on an existing slot, so it must also
-- refresh the cached count when that flag is added or removed.
DROP TRIGGER IF EXISTS trg_questions_refresh_mock_test_count_update ON question_slots;
CREATE TRIGGER trg_questions_refresh_mock_test_count_update
AFTER UPDATE ON question_slots
FOR EACH ROW EXECUTE FUNCTION refresh_mock_test_question_count();

DROP VIEW IF EXISTS playable_mock_test_questions;
CREATE VIEW playable_mock_test_questions AS
SELECT
  qs.id AS "questionId", qs.mock_test_id, qs.question_no AS "questionNo",
  qc.topic, qc.subtopic, qc.passage, qc.question_text AS text, qc.options,
  to_jsonb(qc.correct_option_indexes) AS "correctOptionIndex",
  qc.accepted_answers AS "acceptedAnswers", qc.grading_rubric AS "gradingRubric",
  qc.expected_answer AS "expectedAnswer", qc.answer_word_limit AS "answerWordLimit",
  qc.numeric_answer AS "numericAnswer", qc.numeric_tolerance AS "numericTolerance",
  qc.question_type AS "questionType", qc.explanation,
  qc.marks_per_correct AS "marksPerCorrect",
  qc.negative_marks_per_wrong AS "negativeMarksPerWrong"
FROM question_slots qs
JOIN question_contents qc ON qc.id = qs.content_id
WHERE qs.status <> 'rejected'
  AND qs.review_flags->>'staleFromReprocess' IS DISTINCT FROM 'true'
ORDER BY qs.mock_test_id, qs.question_no;

UPDATE mock_tests mt
SET total_questions = (
  SELECT count(*)::INT FROM question_slots qs
  WHERE qs.mock_test_id = mt.id AND qs.status <> 'rejected'
    AND qs.review_flags->>'staleFromReprocess' IS DISTINCT FROM 'true'
);
