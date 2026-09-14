-- Public templates need a real publication timestamp for the catalog-style
-- publisher metadata shown on template cards. Existing public templates were
-- already available before this column existed, so use their creation time.
ALTER TABLE extraction_templates
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE extraction_templates
SET published_at = created_at
WHERE is_public = TRUE
  AND published_at IS NULL;
