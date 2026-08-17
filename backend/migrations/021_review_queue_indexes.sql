-- Supports the Extraction Review Queue (review-queue.repository.js#listNeedsReview)
-- - a cross-cluster inbox of every question sitting at status = 'needs_review',
-- so a reviewer isn't stuck opening one mock test's ReviewTab at a time.

-- Partial index: this is the one query the whole page depends on, and it
-- should never need to touch approved/rejected rows - a plain
-- (workspace_id, status) index would also index every already-decided
-- question forever, for no benefit to this page.
CREATE INDEX IF NOT EXISTS questions_workspace_status_idx
  ON questions (workspace_id, status)
  WHERE status = 'needs_review';

-- Powers "lowest confidence first", the queue's default sort - the AI's
-- least-certain extractions surface first instead of being buried behind
-- confident ones a reviewer would otherwise have to click past.
CREATE INDEX IF NOT EXISTS questions_confidence_idx
  ON questions (confidence);
