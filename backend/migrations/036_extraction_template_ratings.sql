-- Real ratings for extraction_templates. The `rating` column (002) has
-- existed since the very first migration, but nothing has ever written to
-- it except the platform-curated seed data's hardcoded numbers (4.4-4.9)
-- and, in principle, a direct PATCH with a manual `rating` field that the
-- frontend has never actually exposed (CreateTemplateModal.jsx explicitly
-- keeps `rating` out of its payload). There has never been a way for a
-- user to actually submit a rating - this migration adds that.

-- One row per (template, user) - a user can rate a template once and
-- change their mind later (an UPDATE via upsert), not stack up duplicate
-- votes. Deliberately NOT workspace-scoped the way usage counting is
-- (extraction_template_applications, 004): a user's opinion of a template
-- belongs to the user, not to whichever workspace they happened to be
-- acting in when they rated it - the same global, platform-curated
-- template looks identical from every workspace, and a single user can
-- belong to more than one workspace (see workspace_members).
CREATE TABLE IF NOT EXISTS extraction_template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES extraction_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_extraction_template_ratings_template_id
ON extraction_template_ratings(template_id);

DROP TRIGGER IF EXISTS trg_extraction_template_ratings_updated_at ON extraction_template_ratings;
CREATE TRIGGER trg_extraction_template_ratings_updated_at
BEFORE UPDATE ON extraction_template_ratings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A bare average with no count attached ("4.8 stars") is close to
-- meaningless for trust - "4.8 from 3 ratings" and "4.8 from 300" are very
-- different claims, and the frontend needs the count to show that
-- distinction (see TemplateCard.jsx / PopularTemplateCard.jsx). The 8
-- platform-curated global templates seeded in 002 keep their hand-set
-- rating with a 0 count as a one-time bootstrap - same treatment
-- usage_count's seeded numbers got in 004 - real ratings simply add on
-- top from here; nothing resets the seed value until someone actually
-- rates one of those templates, at which point the trigger below takes
-- over for it same as any other.
ALTER TABLE extraction_templates
  ADD COLUMN IF NOT EXISTS rating_count INT NOT NULL DEFAULT 0 CHECK (rating_count >= 0);

-- From here forward, `rating`/`rating_count` on a template that has at
-- least one row in extraction_template_ratings are owned by this trigger,
-- not by anything else - a manual PATCH with a `rating` field (still
-- technically accepted by extraction-templates.service.js, unused by the
-- current frontend) would just get overwritten the next time anyone
-- submits, changes, or removes a real rating for that template.
CREATE OR REPLACE FUNCTION refresh_extraction_template_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID := COALESCE(NEW.template_id, OLD.template_id);
BEGIN
  UPDATE extraction_templates
  SET
    rating = (
      SELECT round(avg(rating)::numeric, 2)
      FROM extraction_template_ratings
      WHERE template_id = target_id
    ),
    rating_count = (
      SELECT count(*)::INT
      FROM extraction_template_ratings
      WHERE template_id = target_id
    )
  WHERE id = target_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_extraction_template_ratings_refresh ON extraction_template_ratings;
CREATE TRIGGER trg_extraction_template_ratings_refresh
AFTER INSERT OR UPDATE OR DELETE ON extraction_template_ratings
FOR EACH ROW EXECUTE FUNCTION refresh_extraction_template_rating();
