-- Fixes 'rejected' being a status with no functional effect. Two places
-- treat every question in `questions` as live regardless of status, so a
-- question rejected via the Review tab or via Duplicate resolution
-- (duplicates.service.js#resolveDuplicate) kept being served in brand new
-- exam attempts and kept being counted in the number advertised to
-- students - the row was correctly marked 'rejected', but nothing ever
-- read that mark.

-- playable_mock_test_questions (013/017) is the ONLY thing
-- attempts.service.js#startAttempt and mock-tests.service.js
-- #getPlayableMockTest read from - they never touch `questions`
-- directly. The view had no status filter at all since it was first
-- created in 002_rename_playable_questions_view.sql, so a rejected
-- question (whether rejected through ordinary review or through
-- duplicate resolution) was exactly as playable as an approved one.
-- Filtering here, in the view, is deliberate over filtering in
-- mock-tests.repository.js#listPlayableQuestions: it makes "rejected
-- questions are never playable" a property of the view itself, so any
-- future caller of playable_mock_test_questions inherits the same
-- guarantee automatically instead of needing to remember to repeat this
-- WHERE clause.
--
-- 'needs_review' stays playable - that's existing, intentional behavior
-- (this app doesn't gate exam-readiness on question status, only on the
-- mock test's own status reaching 'published'/being shared) and isn't
-- part of the bug being fixed here; only 'rejected' - the status that's
-- supposed to mean "never show this again" - is being excluded.
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
  q.explanation,
  q.has_code AS "hasCode",
  q.code_language AS "codeLanguage",
  q.code_snippet AS "codeSnippet"
FROM questions q
WHERE q.status <> 'rejected'
ORDER BY q.mock_test_id, q.question_no;

-- mock_tests.total_questions (refresh_mock_test_question_count(), 001) is
-- the second place status was silently ignored: it's the number shown to
-- students in the public catalog (CatalogBrowser.jsx,
-- MockTestDetailModal.jsx) and on the mock test card in the editor
-- (MockTestCard.jsx) BEFORE they ever open the test, and it's also used
-- directly (not re-derived from the actual playable question list) by
-- attempts.service.js#startAttempt to proportionally size a topic-wise
-- practice session's duration. A rejected duplicate inflated this number
-- in both places even though it could never actually appear in an exam.
CREATE OR REPLACE FUNCTION refresh_mock_test_question_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE mock_tests
    SET total_questions = (
      SELECT count(*)::INT
      FROM questions
      WHERE mock_test_id = OLD.mock_test_id
        AND status <> 'rejected'
    )
    WHERE id = OLD.mock_test_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE mock_tests
    SET total_questions = (
      SELECT count(*)::INT
      FROM questions
      WHERE mock_test_id = NEW.mock_test_id
        AND status <> 'rejected'
    )
    WHERE id = NEW.mock_test_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- The trigger function above only re-runs on the NEXT insert/update/delete
-- of a `questions` row for a given mock test - it does nothing for a
-- mock_tests.total_questions value that's already sitting there stale
-- from before this migration. Backfill every mock test's count once,
-- immediately, using the same "exclude rejected" rule, so an existing
-- mock test with an already-rejected duplicate is corrected right away
-- instead of silently staying wrong until its next unrelated question edit.
UPDATE mock_tests mt
SET total_questions = (
  SELECT count(*)::INT
  FROM questions q
  WHERE q.mock_test_id = mt.id
    AND q.status <> 'rejected'
);
