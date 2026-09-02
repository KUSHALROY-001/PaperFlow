-- Expose per-question marks on the playable view so the exam session
-- can show marking to students when the publisher enables
-- settings.showMarksToStudents (default off).

DROP VIEW IF EXISTS playable_mock_test_questions;

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
  qc.explanation,
  qc.marks_per_correct AS "marksPerCorrect",
  qc.negative_marks_per_wrong AS "negativeMarksPerWrong"
FROM question_slots qs
JOIN question_contents qc ON qc.id = qs.content_id
WHERE qs.status <> 'rejected'
ORDER BY qs.mock_test_id, qs.question_no;
