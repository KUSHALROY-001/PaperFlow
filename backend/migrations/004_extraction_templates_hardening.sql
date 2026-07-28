-- Builds on top of 002_extraction_templates.sql (already applied). Does not
-- touch existing rows or columns - additive only.

-- 1. Soft-disable, so a template can be retired without losing its
--    usage_count history or breaking existing template_applications rows.
ALTER TABLE extraction_templates
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_extraction_templates_is_active
ON extraction_templates(is_active);

-- 2. Audit trail: records every time a template is applied to a workspace,
--    so `usage_count` stops being a naked counter and becomes a real
--    aggregate - same pattern already used for mock_tests.total_questions.
CREATE TABLE IF NOT EXISTS extraction_template_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES extraction_templates(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mock_test_id UUID REFERENCES mock_tests(id) ON DELETE SET NULL,
  applied_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extraction_template_applications_template_id
ON extraction_template_applications(template_id);

CREATE INDEX IF NOT EXISTS idx_extraction_template_applications_workspace_id
ON extraction_template_applications(workspace_id);

-- 3. From this migration forward, usage_count is owned by this trigger.
--    The existing seeded numbers (1240, 890, ...) are left untouched as a
--    one-time bootstrap; only real applications increment it from here on.
CREATE OR REPLACE FUNCTION bump_extraction_template_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE extraction_templates
  SET usage_count = usage_count + 1
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_extraction_template_applications_bump_usage ON extraction_template_applications;
CREATE TRIGGER trg_extraction_template_applications_bump_usage
AFTER INSERT ON extraction_template_applications
FOR EACH ROW EXECUTE FUNCTION bump_extraction_template_usage_count();
