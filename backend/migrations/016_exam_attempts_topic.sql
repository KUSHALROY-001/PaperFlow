-- Topic-wise practice: an attempt can now optionally scope itself to one
-- topic within the mock test instead of the whole thing (see
-- OverviewTab.jsx's existing "Topic-wise Practice" links, which already
-- pointed at /session/:id?topic=X - nothing on the backend ever read that
-- query param before this).
--
-- topic NULL means "the whole mock test", same as every attempt today -
-- this migration changes no existing row's behavior.
ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS topic TEXT;

-- 011_exam_attempts_dedupe_in_progress.sql's unique index enforces "at
-- most one in_progress attempt per (workspace, mock test, user)" - which,
-- unchanged, would mean starting a Topic-A practice attempt while a
-- full-test (or Topic-B) attempt is still in_progress would hit that
-- constraint, silently resume the WRONG question set (via
-- findActiveAttemptForUser, updated alongside this migration), and the
-- student would end up answering Topic-B questions while the UI still
-- said "Topic A". Recreating the index with topic included fixes that -
-- a full-test attempt and any number of distinct topic-practice attempts
-- can now all be in_progress at once per user, while still preventing two
-- concurrent in_progress attempts within the SAME topic (or the same
-- full-test/no-topic case).
--
-- COALESCE(topic, '') rather than bare `topic` in the index: a plain
-- multi-column unique index treats two NULLs as distinct from each other
-- (not equal), which would silently remove the original dedupe guarantee
-- for the "no topic" full-test case - exactly the bug 011 was written to
-- fix in the first place. Coalescing to '' first makes NULL compare equal
-- to NULL again, same as every other value.
DROP INDEX IF EXISTS uq_exam_attempts_one_in_progress_per_user;

CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_attempts_one_in_progress_per_user_topic
  ON exam_attempts (workspace_id, mock_test_id, user_id, COALESCE(topic, ''))
  WHERE status = 'in_progress' AND user_id IS NOT NULL;
