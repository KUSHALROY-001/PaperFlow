-- Public Test Catalog: a browsable, unauthenticated page where students
-- can search a workspace's free/public mock tests, instead of only ever
-- discovering a test via a secret share_token link.
--
-- Two separate gates, deliberately not reusing mock_tests.status alone:
-- status='published' means "ready to be taken via a link you already
-- have" (unchanged, existing meaning). is_catalog_listed means "ready for
-- strangers to find" - a workspace can keep publishing tests for private
-- share-link distribution without ever exposing them publicly. The
-- catalog only ever shows a test where BOTH are true.
ALTER TABLE mock_tests
  ADD COLUMN IF NOT EXISTS is_catalog_listed BOOLEAN NOT NULL DEFAULT false;

-- Nullable and unique: a workspace has no public catalog at all until an
-- admin explicitly sets one, matching the app's existing "opt-in, not
-- automatic" pattern for anything workspace-facing (see shared_mock_tests
-- - a share link doesn't exist until someone creates one). CITEXT for a
-- case-insensitive match on the public URL, consistent with how
-- users.email already uses it.
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS public_slug CITEXT UNIQUE;

-- Matches the exact WHERE clause the catalog's browse query runs -
-- partial so it costs nothing on the (typical) workspace that never
-- lists anything publicly.
CREATE INDEX IF NOT EXISTS mock_tests_catalog_idx
  ON mock_tests (workspace_id, is_catalog_listed)
  WHERE is_catalog_listed = true AND status = 'published';