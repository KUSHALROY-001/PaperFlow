-- Backfills a ![[img:default]] marker into every existing question that
-- still relies on the legacy placement column (migration 015) to
-- position its single 'default'-slot diagram, so it renders through the
-- exact same inline-marker mechanism every non-default slot has used
-- since migration 038, instead of a separate top-level
-- above_text/below_text/below_options fallback. Migration 042 (run
-- after this one) drops the now-unused placement column.
--
-- Only touches rows with a non-empty storage_path - an asset row with no
-- real image behind it (should be rare, but not impossible) would just
-- render a "Missing image" placeholder wherever the new marker landed,
-- which is worse than what it does today (nothing).
--
-- Idempotent: the NOT LIKE guard on each UPDATE means re-running this
-- migration (e.g. if it's re-applied after a partial failure) never
-- inserts a second marker into a question that already has one.

-- above_text: the diagram used to render before the question stem, so
-- the marker is prepended.
UPDATE question_contents qc
SET question_text = '![[img:default]]' || E'\n\n' || qc.question_text
FROM question_slots qs
JOIN question_assets qa ON qa.question_id = qs.id
WHERE qc.id = qs.content_id
  AND qa.slot_key = 'default'
  AND qa.placement = 'above_text'
  AND COALESCE(qa.storage_path, '') <> ''
  AND qc.question_text NOT LIKE '%![[img:default]]%';

-- below_text (the default value every pre-migration-015 row already
-- has): the diagram used to render after the stem but before the
-- options, so the marker is appended to the question text.
UPDATE question_contents qc
SET question_text = qc.question_text || E'\n\n' || '![[img:default]]'
FROM question_slots qs
JOIN question_assets qa ON qa.question_id = qs.id
WHERE qc.id = qs.content_id
  AND qa.slot_key = 'default'
  AND qa.placement = 'below_text'
  AND COALESCE(qa.storage_path, '') <> ''
  AND qc.question_text NOT LIKE '%![[img:default]]%';

-- below_options: nothing in question_contents renders after the options
-- grid except explanation (see QuestionContent.jsx/render-html.js), so
-- that's where the marker goes - prepended to any existing explanation,
-- or as the explanation's entire content if there wasn't one. This is an
-- approximation: the diagram now visually sits inside the "Explanation"
-- box instead of its own unlabeled block. Flagged as a known trade-off
-- of this migration, not a bug - a question editor can drag the marker
-- to a better spot in either field after the fact, same as any other
-- inline image.
UPDATE question_contents qc
SET explanation = CASE
  WHEN qc.explanation IS NULL OR qc.explanation = ''
    THEN '![[img:default]]'
  ELSE '![[img:default]]' || E'\n\n' || qc.explanation
END
FROM question_slots qs
JOIN question_assets qa ON qa.question_id = qs.id
WHERE qc.id = qs.content_id
  AND qa.slot_key = 'default'
  AND qa.placement = 'below_options'
  AND COALESCE(qa.storage_path, '') <> ''
  AND qc.question_text NOT LIKE '%![[img:default]]%'
  AND COALESCE(qc.explanation, '') NOT LIKE '%![[img:default]]%';
