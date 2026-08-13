-- Phase 2 of the code-formatting fix (see Phase 1: worker/question_parser.py
-- no longer collapses a question's internal whitespace during regex
-- extraction, worker/ai/schemas.py's per-question schema gained has_code/
-- code_language alongside the existing has_diagram/diagram_bbox, and
-- worker/reconcile.py carries both through the AI/regex merge instead of
-- re-collapsing whichever side's text wins).
--
-- Note has_diagram/diagram_bbox themselves are NOT columns on this table -
-- they're transient fields in the AI extraction schema only, used to
-- decide whether to crop and persist a row into question_assets
-- (009_question_assets.sql), which is what OutputTab/ReviewTab actually
-- read from (a diagramUrl derived from that table, not a boolean column
-- here). has_code/code_language are different: there's no cropped asset
-- to store, and the current text itself IS the code - so these two are
-- genuinely new columns on `questions`, not a second table.
--
-- code_language is deliberately free-text, not an ENUM: schemas.py treats
-- it as the model's best guess ("c", "python", "pseudocode", ...), not a
-- fixed set Claude is validating against, and a CHECK/ENUM here would
-- reject a perfectly good guess the moment the model returns a language
-- nobody enumerated yet.
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS has_code BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS code_language TEXT;
