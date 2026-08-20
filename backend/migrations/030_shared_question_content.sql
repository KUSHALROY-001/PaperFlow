-- Numbered 030 (originally authored as 028, alongside
-- 028_playable_questions_subtopic_passage.sql from a parallel branch of
-- work that landed first) so it runs after both that migration and 029.
-- See step 2b below for the one change this required: dropping and
-- recreating playable_mock_test_questions, which 028 also touched.
--
-- Real storage deduplication for questions, not just visibility filtering
-- (027 made 'rejected' actually hide a question from exams; this fixes
-- the underlying redundancy - four mock tests independently extracting
-- "the same" question end up as four full-content rows today, and
-- 027 never changed that).
--
-- questions becomes TWO tables:
--   - question_slots: what's specific to ONE mock test having this
--     question at position N - mock_test_id, question_no, status,
--     confidence, source_page. Still exactly one row per (mock test,
--     question).
--   - question_contents (new): the actual question - text, options,
--     correct answer, explanation, topic, code fields. Many slots can
--     point at the SAME content row via question_slots.content_id, so
--     the same question appearing in four mock tests is stored ONCE and
--     referenced four times, not stored four times.
--
-- Sharing is established two ways going forward: duplicates.service.js's
-- 'merge' action (a reviewer confirming two extractions are the same
-- question) repoints one slot's content_id onto the other's instead of
-- copying+rejecting; question-bank.service.js's "copy into a mock test"
-- now points the new slot at the SOURCE's existing content_id instead of
-- duplicating its text+options. Editing a shared question's content
-- FORKS it first (see questions.service.js#updateQuestion) - cloning the
-- content row and repointing only the slot being edited - so fixing a
-- typo in one mock test can never silently change what a different,
-- unrelated (possibly already-published) mock test shows its students.
-- This is the same copy-on-write precedent source_question_id (020) and
-- question-bank copying already established elsewhere in this app.
--
-- `questions` is kept alive as a VIEW with the exact same column names
-- and shapes it had before this migration (see near the bottom), so
-- every existing read-only `SELECT ... FROM questions` across this
-- codebase (attempts.repository.js's scoring/review queries,
-- review-queue.repository.js, students.repository.js,
-- catalog.repository.js, question-bank.repository.js's search) keeps
-- working completely unchanged. Only code that WRITES to `questions`
-- directly needed updating (questions.repository.js,
-- worker/db.py#replace_questions, question-bank.repository.js
-- #insertCopiedQuestion, duplicates.service.js) - a view can't be
-- INSERTed/UPDATEd into the way a table can, by design, so those call
-- sites now write to question_slots/question_contents directly instead.

-- ============================================================
-- 1. The new shared content table
-- ============================================================
CREATE TABLE question_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  topic TEXT,
  subtopic TEXT,
  passage TEXT,
  question_text TEXT NOT NULL,
  explanation TEXT,
  question_type question_type NOT NULL DEFAULT 'single',
  correct_option_indexes INT[] NOT NULL,
  marks_per_correct NUMERIC(6,2) CHECK (marks_per_correct IS NULL OR marks_per_correct >= 0),
  negative_marks_per_wrong NUMERIC(6,2) CHECK (negative_marks_per_wrong IS NULL OR negative_marks_per_wrong >= 0),
  has_code BOOLEAN NOT NULL DEFAULT false,
  code_language TEXT,
  code_snippet TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(correct_option_indexes) > 0)
);

DROP TRIGGER IF EXISTS trg_question_contents_updated_at ON question_contents;
CREATE TRIGGER trg_question_contents_updated_at
BEFORE UPDATE ON question_contents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. Rename the physical table. Every existing FK that pointed at
--    questions(id) - question_options (temporarily, fixed up below),
--    exam_answers.question_id, question_assets.question_id,
--    questions.source_question_id (self-ref), question_duplicate_pairs'
--    two FKs - keeps working automatically: Postgres updates a
--    constraint's target when the table it references is renamed, it
--    does not need to be dropped and recreated. Same for existing
--    indexes/triggers already attached to this table.
-- ============================================================
ALTER TABLE questions RENAME TO question_slots;

-- ============================================================
-- 2b. This workspace's history also contains
--     028_playable_questions_subtopic_passage.sql, which redefined
--     playable_mock_test_questions to read subtopic/passage directly off
--     `questions` (now question_slots, after the rename immediately
--     above). That old view still exists at this point and still depends
--     on question_slots.topic/subtopic/passage/etc, so step 5 below
--     (which drops exactly those columns off question_slots) would fail
--     with "cannot drop column ... other objects depend on it" if the
--     view weren't cleared out of the way first. Dropped here, recreated
--     near the bottom of this migration (step 11) against the new
--     question_slots/question_contents split - with subtopic and passage
--     carried forward so that migration's addition isn't lost.
-- ============================================================
DROP VIEW IF EXISTS playable_mock_test_questions;

-- ============================================================
-- 3. Add content_id and backfill it 1:1 - every existing slot gets its
--    own new content row carrying exactly the data it already had. This
--    step alone is lossless and doesn't share anything yet; sharing is
--    established by the backfill in step 6 below and, from here on,
--    by the application code described at the top of this file.
-- ============================================================
ALTER TABLE question_slots ADD COLUMN content_id UUID;

-- legacy_slot_id is a temporary bridging column that only exists to
-- correlate each freshly-inserted content row back to the slot it came
-- from, so the UPDATE just below can set content_id correctly. Dropped
-- immediately after use - it has no purpose once every slot has its
-- content_id set.
ALTER TABLE question_contents ADD COLUMN legacy_slot_id UUID;

INSERT INTO question_contents (
  id, workspace_id, topic, subtopic, passage, question_text, explanation,
  question_type, correct_option_indexes, marks_per_correct,
  negative_marks_per_wrong, has_code, code_language, code_snippet,
  metadata, created_at, updated_at, legacy_slot_id
)
SELECT
  gen_random_uuid(), workspace_id, topic, subtopic, passage, question_text,
  explanation, question_type, correct_option_indexes, marks_per_correct,
  negative_marks_per_wrong, has_code, code_language, code_snippet,
  metadata, created_at, updated_at, id
FROM question_slots;

UPDATE question_slots qs
SET content_id = qc.id
FROM question_contents qc
WHERE qc.legacy_slot_id = qs.id;

ALTER TABLE question_contents DROP COLUMN legacy_slot_id;

ALTER TABLE question_slots ALTER COLUMN content_id SET NOT NULL;
ALTER TABLE question_slots
  ADD CONSTRAINT question_slots_content_id_fkey
  FOREIGN KEY (content_id) REFERENCES question_contents(id);

-- ============================================================
-- 4. Repoint question_options from the slot to the content. Column NAME
--    stays `question_id` deliberately (not renamed to content_id) - it
--    minimizes the diff across every existing query that reads options
--    via `question_options qo WHERE qo.question_id = <some question's
--    id>` (attempts.repository.js, duplicates.repository.js,
--    review-queue.repository.js, question-bank.repository.js, the
--    playable_mock_test_questions view). Every one of those call sites
--    only needed a one-token fix (pass the CONTENT id instead of the
--    slot id into that same WHERE clause), not a column rename.
--    Genuinely misleading as a name now that it holds a content id, not
--    a question_slots id - flagged here for whoever names the next
--    migration that touches this table.
-- ============================================================
ALTER TABLE question_options
  DROP CONSTRAINT question_options_question_id_fkey;

UPDATE question_options qo
SET question_id = qs.content_id
FROM question_slots qs
WHERE qo.question_id = qs.id;

ALTER TABLE question_options
  ADD CONSTRAINT question_options_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES question_contents(id) ON DELETE CASCADE;

-- ============================================================
-- 5. Drop the now-duplicated content columns from question_slots. Any
--    index defined on one of these columns (idx_questions_topic,
--    questions_text_trgm_idx, questions_workspace_topic_idx) is dropped
--    automatically along with its column - recreated on
--    question_contents further down instead.
-- ============================================================
ALTER TABLE question_slots
  DROP COLUMN topic,
  DROP COLUMN subtopic,
  DROP COLUMN passage,
  DROP COLUMN question_text,
  DROP COLUMN explanation,
  DROP COLUMN question_type,
  DROP COLUMN correct_option_indexes,
  DROP COLUMN marks_per_correct,
  DROP COLUMN negative_marks_per_wrong,
  DROP COLUMN has_code,
  DROP COLUMN code_language,
  DROP COLUMN code_snippet,
  DROP COLUMN metadata;

-- ============================================================
-- 6. Backfill: collapse EXISTING confirmed duplicate merges into real
--    shared content. Before this migration, duplicates.service.js's
--    'merge' action rejected the losing slot but left its content
--    physically separate - this repoints it onto the winner's content
--    row instead, and step 7 below reclaims the now-orphaned content row
--    that only that loser was using.
--
--    Deliberately conservative: only acts on a pair where EXACTLY one
--    side is 'rejected' (the old merge action's own signal for "this
--    side lost") - a pair where neither or both sides ended up rejected
--    (hand-edited afterwards, or predating the duplicate-detection
--    feature entirely) is left untouched rather than guessed at.
--
--    This does NOT change either side's status - a previously-rejected
--    loser stays rejected (still correctly hidden per migration 027).
--    That's a separate, already-made reviewer decision ("don't show this
--    in THAT mock test again") from "share storage with the winner",
--    which is all this step does. Going forward, 'merge' no longer
--    rejects anything at all (see duplicates.service.js) - this
--    backward-compatible path only matters for pairs merged before this
--    migration ran.
-- ============================================================
WITH resolved_pairs AS (
  SELECT
    CASE
      WHEN a.status = 'rejected' AND b.status <> 'rejected' THEN a.id
      WHEN b.status = 'rejected' AND a.status <> 'rejected' THEN b.id
    END AS loser_slot_id,
    CASE
      WHEN a.status = 'rejected' AND b.status <> 'rejected' THEN b.content_id
      WHEN b.status = 'rejected' AND a.status <> 'rejected' THEN a.content_id
    END AS winner_content_id
  FROM question_duplicate_pairs dp
  JOIN question_slots a ON a.id = dp.question_id_a
  JOIN question_slots b ON b.id = dp.question_id_b
  WHERE dp.status = 'confirmed'
)
UPDATE question_slots qs
SET content_id = rp.winner_content_id
FROM resolved_pairs rp
WHERE qs.id = rp.loser_slot_id
  AND rp.winner_content_id IS NOT NULL
  AND qs.content_id <> rp.winner_content_id;

-- ============================================================
-- 7. Reclaim storage: any content row no slot points to anymore (every
--    loser repointed in step 6) is genuinely dead weight now - delete
--    it. ON DELETE CASCADE on question_options' FK (step 4) takes its
--    now-orphaned option rows with it. This is the actual space savings
--    "only one question would be there" asked for, not just a schema
--    reshuffle.
-- ============================================================
DELETE FROM question_contents qc
WHERE NOT EXISTS (
  SELECT 1 FROM question_slots qs WHERE qs.content_id = qc.id
);

-- ============================================================
-- 8. Indexes on question_contents, replacing the ones dropped in step 5.
-- ============================================================
CREATE INDEX IF NOT EXISTS question_contents_workspace_topic_idx
  ON question_contents (workspace_id, topic);

CREATE INDEX IF NOT EXISTS question_contents_text_trgm_idx
  ON question_contents USING GIN (question_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS question_slots_content_id_idx
  ON question_slots (content_id);

-- ============================================================
-- 9. The compatibility view - see the file-level comment at the top for
--    why this exists. Exact same column set, names, and order
--    `questions` had immediately before this migration, so `SELECT *`
--    and every named-column SELECT elsewhere in this codebase keeps
--    returning the same shape.
-- ============================================================
CREATE VIEW questions AS
SELECT
  qs.id,
  qs.workspace_id,
  qs.mock_test_id,
  qs.question_no,
  qc.topic,
  qc.subtopic,
  qc.passage,
  qc.question_text,
  qc.explanation,
  qc.question_type,
  qc.correct_option_indexes,
  qc.marks_per_correct,
  qc.negative_marks_per_wrong,
  qs.source_page,
  qs.confidence,
  qs.status,
  qc.metadata,
  qs.created_at,
  qs.updated_at,
  qc.has_code,
  qc.code_language,
  qc.code_snippet,
  qs.source_question_id,
  qs.content_id
FROM question_slots qs
JOIN question_contents qc ON qc.id = qs.content_id;

-- ============================================================
-- 10. The total_questions trigger (001, tightened in 027) counted
--     `questions` directly - repoint it at the physical question_slots
--     table instead of the view. Functionally this would have produced
--     the same count either way (the view still yields exactly one row
--     per slot, shared content or not), but there's no reason to make a
--     hot AFTER-trigger join through question_contents just to arrive at
--     a number that never needed the content columns in the first
--     place. The trigger attachments themselves (001) need no change -
--     they followed question_slots automatically through the rename in
--     step 2.
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_mock_test_question_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE mock_tests
    SET total_questions = (
      SELECT count(*)::INT
      FROM question_slots
      WHERE mock_test_id = OLD.mock_test_id
        AND status <> 'rejected'
    )
    WHERE id = OLD.mock_test_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE mock_tests
    SET total_questions = (
      SELECT count(*)::INT
      FROM question_slots
      WHERE mock_test_id = NEW.mock_test_id
        AND status <> 'rejected'
    )
    WHERE id = NEW.mock_test_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 11. playable_mock_test_questions (013/017/027/028) selected straight
--     from `questions`. Repointed at question_slots joined through
--     question_contents directly, same reasoning as step 10 - avoid an
--     unnecessary extra hop through the compatibility view on a query
--     that runs on every single exam page load. subtopic/passage carried
--     forward from 028_playable_questions_subtopic_passage.sql (dropped
--     back in step 2b above) so that migration's addition survives this
--     one - mock-tests.repository.js#listPlayableQuestions still selects
--     both by name and would otherwise start erroring on a missing
--     column.
-- ============================================================
CREATE VIEW playable_mock_test_questions AS
SELECT
  qs.id AS "questionId",
  qs.mock_test_id,
  qs.question_no AS "questionNo",
  qc.topic,
  qc.subtopic,
  qc.passage,
  qc.question_text AS text,
  COALESCE(
    (
      SELECT jsonb_agg(qo.option_text ORDER BY qo.option_index)
      FROM question_options qo
      WHERE qo.question_id = qc.id
    ),
    '[]'::jsonb
  ) AS options,
  to_jsonb(qc.correct_option_indexes) AS "correctOptionIndex",
  qc.question_type AS "questionType",
  qc.explanation,
  qc.has_code AS "hasCode",
  qc.code_language AS "codeLanguage",
  qc.code_snippet AS "codeSnippet"
FROM question_slots qs
JOIN question_contents qc ON qc.id = qs.content_id
WHERE qs.status <> 'rejected'
ORDER BY qs.mock_test_id, qs.question_no;