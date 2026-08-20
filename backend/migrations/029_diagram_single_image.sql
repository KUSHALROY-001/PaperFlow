-- Reverses migration 014's two-file-per-diagram design. That migration's
-- own rationale was explicit: "without a separate immutable original, a
-- second edit would be cropping an already-cropped (and already-shrunk)
-- image, degrading quality and permanently losing whatever was trimmed
-- off the first edit." This migration accepts that exact tradeoff on
-- purpose - one stored image per diagram, and a second crop starts from
-- the first crop's result, not from a pristine original - in exchange for
-- not doubling storage for every single diagram in the system.
--
-- storage_path (unchanged) keeps meaning exactly what it always has: "the
-- file currently being served" via /api/questions/:questionId/diagram.
-- Every existing row's current image is untouched by this migration -
-- there is no data loss for what's currently displayed, only for the
-- ability to revert a crop back to the original extraction.
--
-- has_manual_crop existed solely to let the frontend decide whether to
-- show "Reset to auto-crop" - a feature that has no meaning once there's
-- no separate original left to reset to, so it's removed along with
-- original_storage_path rather than kept as now-dead state.
ALTER TABLE question_assets
  DROP COLUMN IF EXISTS original_storage_path,
  DROP COLUMN IF EXISTS has_manual_crop;

-- Note: this migration does NOT delete the now-orphaned *.original.png
-- files already sitting on disk from before this change - a SQL migration
-- has no safe way to reach into the filesystem, and this codebase's
-- existing migrations never do. They're harmless (nothing references them
-- once this commits) but do waste disk space; see the companion cleanup
-- script mentioned in the PR/commit that introduced this migration if you
-- want to reclaim it.
