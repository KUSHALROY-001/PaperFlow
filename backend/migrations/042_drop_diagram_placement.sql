-- Removes the placement enum (migration 015) that used to decide where a
-- question's single 'default'-slot diagram rendered relative to its text
-- and options. Every question that relied on it got a ![[img:default]]
-- marker backfilled into its text/explanation by migration 041, which
-- must run before this one - a diagram's position is now entirely a
-- function of where its own marker sits in the question's content,
-- exactly like every non-default slot has worked since migration 038.
ALTER TABLE question_assets
  DROP CONSTRAINT IF EXISTS question_assets_placement_check;

ALTER TABLE question_assets
  DROP COLUMN IF EXISTS placement;
