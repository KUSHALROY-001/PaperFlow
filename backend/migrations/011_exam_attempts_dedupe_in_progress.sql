-- startAttempt (attempts.service.js) already tries to reuse an existing
-- in_progress attempt for a given (workspace, mock test, user) before
-- inserting a new one, but that "check then insert" isn't atomic across
-- transactions. Two concurrent start calls for the same user/mock test -
-- e.g. React StrictMode double-invoking the start effect in dev, a
-- double-click, or two open tabs - can both run their SELECT before
-- either INSERT commits, so both find nothing and both insert. That
-- produces two in_progress rows: whichever one the frontend happened to
-- keep in state gets abandoned/submitted normally, and the other sits
-- there forever as a phantom "in progress" card with no way to reach it
-- from the UI.
--
-- This partial unique index makes the second insert fail at the DB level
-- instead of silently succeeding. Only applies to logged-in users
-- (user_id IS NOT NULL) - guest/anonymous attempts are intentionally
-- allowed to have multiple concurrent in_progress rows per mock test,
-- since two different anonymous people share no identity to dedupe on.
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY workspace_id, mock_test_id, user_id
      ORDER BY started_at DESC, id DESC
    ) AS rn
  FROM exam_attempts
  WHERE status = 'in_progress' AND user_id IS NOT NULL
)
UPDATE exam_attempts
SET status = 'abandoned'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_attempts_one_in_progress_per_user
  ON exam_attempts (workspace_id, mock_test_id, user_id)
  WHERE status = 'in_progress' AND user_id IS NOT NULL;