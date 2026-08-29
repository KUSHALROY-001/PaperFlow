-- Lets a question have MORE than one image, each anchored to an exact
-- spot in the question's own content via an inline marker
-- (![[img:slot-key]]) embedded directly in text/options/table cells -
-- the same "special syntax inline in plain text, resolved at render
-- time" pattern already established for math ($...$) and GFM tables
-- (| a | b |), extended to a third kind of inline content instead of
-- inventing a fourth different mechanism.
--
-- slot_key is what a ![[img:slot-key]] marker references. Every existing
-- row gets 'default' - this is NOT a placeholder value someone has to
-- clean up: a question with no inline marker anywhere referencing a slot
-- key still renders its 'default' asset via the existing placement
-- column exactly as it always has (see table-html.js/QuestionContent.jsx's
-- resolution logic) - multi-image is purely additive, on top of every
-- question's existing single-image behavior, not a replacement for it.
--
-- UNIQUE (question_id, slot_key), not just an index - two assets on the
-- same question claiming the same slot key would make a
-- ![[img:slot-key]] marker ambiguous about which image it means, so this
-- is enforced at the DB level rather than trusted to the app.
ALTER TABLE question_assets
  ADD COLUMN IF NOT EXISTS slot_key TEXT NOT NULL DEFAULT 'default';

ALTER TABLE question_assets
  ADD CONSTRAINT question_assets_slot_key_unique_per_question
    UNIQUE (question_id, slot_key);

-- slot_key itself needs a stable, URL/marker-safe shape - lowercase
-- letters, digits, and hyphens only, since it appears verbatim inside a
-- ![[img:slot-key]] marker in free-text question content and must never
-- be ambiguous with the marker's own ]] terminator or collide with
-- something a real question might coincidentally type.
ALTER TABLE question_assets
  ADD CONSTRAINT question_assets_slot_key_format
    CHECK (slot_key ~ '^[a-z0-9][a-z0-9-]{0,63}$');
