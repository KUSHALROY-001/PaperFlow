-- Multi-topic practice: a practice attempt can now scope itself to
-- several topics at once instead of exactly one (see OverviewTab.jsx's
-- topic selector, which used to navigate straight to
-- /session/:id?topic=X on a single click - it's now a multi-select with
-- a "Start Practice" button building /session/:id?topics=A&topics=B...).
--
-- topics = NULL still means "the whole mock test", the same meaning
-- topic = NULL had in migration 016 - this migration changes no existing
-- row's effective behavior. Every existing single-topic value is carried
-- forward as a one-element array rather than lost.
ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS topics TEXT[];

UPDATE exam_attempts
  SET topics = ARRAY[topic]
  WHERE topic IS NOT NULL AND topics IS NULL;

ALTER TABLE exam_attempts DROP COLUMN IF EXISTS topic;

-- Same reasoning as migration 016's index, generalized from one topic to
-- a set of topics: COALESCE(topics, ARRAY[]::text[]) makes NULL (the
-- whole mock test) compare equal to NULL again, so at most one
-- in_progress attempt can exist per (workspace, mock test, user, exact
-- topic set). The application layer is responsible for always storing
-- topics pre-sorted (see attempts.service.js#startAttempt) - a plain
-- array-equality index has no way to know that ['A','B'] and ['B','A']
-- are meant to be the same set, so sorting is what makes them compare
-- equal here.
DROP INDEX IF EXISTS uq_exam_attempts_one_in_progress_per_user_topic;

CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_attempts_one_in_progress_per_user_topics
  ON exam_attempts (workspace_id, mock_test_id, user_id, COALESCE(topics, ARRAY[]::text[]))
  WHERE status = 'in_progress' AND user_id IS NOT NULL;
