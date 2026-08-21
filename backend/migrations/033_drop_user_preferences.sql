-- The Settings page's "Preferences" section (default output format, OCR
-- language, auto-approve, email notifications) was never actually wired
-- into any behavior - the upload flow always used its own defaults, and
-- there's no email provider to send notifications through in the first
-- place. Removed the UI and the /api/auth/preferences endpoint; this drops
-- the now-unused storage column.
ALTER TABLE users
  DROP COLUMN IF EXISTS preferences;
