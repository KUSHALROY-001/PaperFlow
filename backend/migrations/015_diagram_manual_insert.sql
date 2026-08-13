-- Part C of the diagram tooling: lets an editor upload an image by hand
-- when extraction never produced one (a missed/malformed bounding box -
-- see asset_extractor.py#normalized_bbox_to_pixels returning None) or
-- produced a wrong one, and lets them choose where that image sits
-- relative to the question text and options.
--
-- source: 'extracted' (default, matches every row inserted before this
-- migration and every row the worker inserts via db.py#replace_questions
-- going forward) vs 'manual' (written only by the new
-- POST /api/questions/:questionId/diagram upload endpoint). Distinguishes
-- "the AI found this" from "an editor uploaded this" - the crop tool
-- itself doesn't care (a manual upload gets original_storage_path written
-- exactly like an extracted one, so Edit Crop works on either), but the
-- frontend's confirm-before-replace copy does: replacing an extraction is
-- worded differently from replacing a previous manual upload.
--
-- placement: where the image renders relative to the question's own text
-- and options - 'above_text' (before the question text), 'below_text'
-- (between text and options - the only position that has ever existed,
-- kept as the default so every existing row's rendering is unchanged),
-- or 'below_options' (after the options block). This is independent of
-- source - an extracted diagram is just as repositionable as a manually
-- uploaded one.
--
-- Deliberately NOT a UNIQUE constraint on question_id, even though the
-- app (and the new replaceAssetForQuestion repository function) currently
-- treats one-asset-per-question as an invariant it enforces itself
-- (delete-then-insert in a transaction) rather than the database - see
-- the original 009_question_assets.sql rationale for keeping the door
-- open to a question having more than one asset later without another
-- migration to first drop a constraint that would then be in the way.

ALTER TABLE question_assets
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'extracted',
  ADD COLUMN IF NOT EXISTS placement TEXT NOT NULL DEFAULT 'below_text';

ALTER TABLE question_assets
  ADD CONSTRAINT question_assets_source_check
    CHECK (source IN ('extracted', 'manual')),
  ADD CONSTRAINT question_assets_placement_check
    CHECK (placement IN ('above_text', 'below_text', 'below_options'));
