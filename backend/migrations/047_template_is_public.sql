-- Workspace-created templates were only visible to that workspace
-- (workspace_id = current). There was no way to publish one for every
-- workspace to browse/apply — including AI-generated templates, which
-- always saved as private. is_public keeps ownership (edit/delete still
-- require workspace_id match) but widens list/get/apply visibility.

ALTER TABLE extraction_templates
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_extraction_templates_is_public
  ON extraction_templates (is_public)
  WHERE is_public = TRUE;
