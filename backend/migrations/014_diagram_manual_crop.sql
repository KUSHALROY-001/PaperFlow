-- Phase 2 of the manual diagram-crop tool (see Phase 1: worker/asset_extractor.py's
-- crop_diagram padding_pct bumped 0.10 -> 0.25, so a newly-extracted diagram is
-- now cropped to 1.5x the detected bounding box in each dimension, deliberately
-- oversized so there's real room for a user to crop it down further by hand).
--
-- original_storage_path: the pristine, oversized extraction output, written
-- once at extraction time (worker/db.py) and never overwritten after that -
-- every manual crop is re-derived from this file, never from a previous
-- manual crop. Without a separate immutable original, a second edit would be
-- cropping an already-cropped (and already-shrunk) image, degrading quality
-- and permanently losing whatever was trimmed off the first edit.
--
-- Nullable deliberately: existing rows (diagrams extracted before this
-- migration) have no oversized original to crop from at all - the frontend
-- uses NULL here to disable the "Edit Crop" button for those and point at
-- "Re-extract from the original PDF" instead, which is the real way an old
-- diagram gets a usable original.
--
-- has_manual_crop: lets the frontend know whether to offer "Reset to
-- auto-crop" for a given diagram. Defaults false - both because that's the
-- correct state for every existing row (no manual crop has ever happened
-- for them) and for a freshly-extracted diagram before anyone has touched it.
--
-- storage_path (existing column) keeps meaning exactly what it means today:
-- "the file currently being served" via /api/questions/:questionId/diagram.
-- Nothing about existing reads of storage_path changes - it's still the one
-- column every current diagram-serving code path uses.

ALTER TABLE question_assets
  ADD COLUMN IF NOT EXISTS original_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS has_manual_crop BOOLEAN NOT NULL DEFAULT false;
