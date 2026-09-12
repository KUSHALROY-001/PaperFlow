-- Removes the review/merge workflow columns from question_duplicate_pairs.
-- The /duplicates page is now a read-only report (grouped by transitive
-- similarity, see duplicates.service.js#listDuplicateGroups) instead of a
-- pending/confirmed/dismissed review queue, and both merge paths that used
-- to write these columns are gone too:
--   - the manual "Keep left/right" action (duplicates.service.js's old
--     resolveDuplicate)
--   - the automatic exact-duplicate merge that ran on every processing job
--     (worker/duplicate_detector.py's old auto_merge_exact_duplicates_*)
-- The one remaining consumer, the AI near-duplicate regeneration pass
-- (worker/db.py#find_flagged_duplicate_slots), no longer needs a status
-- flag either - once it successfully rewrites a flagged question, the pair
-- row is just deleted instead of marked 'confirmed' (see
-- worker/db.py#delete_duplicate_pair), since a deleted row and a
-- "resolved" row mean the same thing here: nothing left to review.
ALTER TABLE question_duplicate_pairs
  DROP COLUMN status,
  DROP COLUMN resolved_at,
  DROP COLUMN resolved_by;

-- Depended on the now-dropped status column - every remaining row is
-- "live" (there's no more pending/resolved split), so the workspace-only
-- index below covers what listDuplicatePairs actually queries by.
DROP INDEX IF EXISTS question_duplicate_pairs_workspace_status_idx;

CREATE INDEX IF NOT EXISTS question_duplicate_pairs_workspace_idx
  ON question_duplicate_pairs (workspace_id);
