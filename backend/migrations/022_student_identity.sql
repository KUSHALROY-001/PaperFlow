-- Student roster / cohort management, Phase 1: PaperFlow has no student
-- identity system today - a guest attempt only carries a one-off display
-- name in metadata.guestName (see shared.service.js#startSharedAttempt),
-- so two attempts by the same person are two unrelated rows with no way
-- to group them. taker_email becomes that stable identity.
--
-- A real column, not folded into metadata like guestName is: the entire
-- roster page is GROUP BY taker_email, and JSON-buried values can't be
-- indexed or grouped on efficiently. CITEXT (already used for
-- users.email and workspace_invitations.email - see 001_initial_schema.sql
-- and 005_team_invitations.sql) matches the same "email comparison should
-- be case-insensitive" behavior those tables already rely on, so
-- "Student@x.com" and "student@x.com" are recognized as the same person.
ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS taker_email CITEXT;

-- Every roster/detail query filters or groups by (workspace_id,
-- taker_email) - this partial index (only rows that actually have an
-- email) carries all of it. Existing rows all have taker_email IS NULL
-- and are simply excluded from the roster until re-attempted with the
-- new required email field (see SharedMockIntro.jsx) - no backfill is
-- possible for them since no email was ever collected in the first place.
CREATE INDEX IF NOT EXISTS exam_attempts_workspace_taker_idx
  ON exam_attempts (workspace_id, taker_email)
  WHERE taker_email IS NOT NULL;
