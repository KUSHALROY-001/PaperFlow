-- Question Bank (Phase 1): no new table - questions/question_options
-- already carry everything the bank needs to display and filter
-- (topic, subtopic, question_type, has_code, has_diagram via
-- question_assets, status, workspace_id). This adds only what's
-- genuinely missing: provenance for a copied question, and the indexes
-- the bank's search/filter queries need to stay fast against a
-- workspace's FULL question history instead of one mock test at a time.

-- Nullable, and deliberately a plain FK rather than anything enforcing
-- the source still exists - a copied question should keep working (and
-- keep showing where it came from) even if the original question or its
-- whole mock test is later deleted. ON DELETE SET NULL, not CASCADE or
-- RESTRICT: deleting the original question must never delete or block
-- deleting the copy, it should just make the copy's provenance link go
-- quiet (the copy is a fully independent row from the moment it's
-- created - see question-bank.repository.js#copyQuestionToMockTest).
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS source_question_id UUID
    REFERENCES questions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS questions_source_question_id_idx
  ON questions (source_question_id)
  WHERE source_question_id IS NOT NULL;

-- The bank's search box does an ILIKE '%term%' scan across every question
-- in the workspace on (effectively) every keystroke (debounced
-- client-side, but still no fixed WHERE-equality clause to lean on) -
-- without a trigram index that's a sequential scan over the whole table
-- past a few hundred rows. pg_trgm is what makes ILIKE '%...%' (not just
-- prefix matches) index-able at all; a plain btree index cannot serve a
-- leading-wildcard search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS questions_text_trgm_idx
  ON questions USING GIN (question_text gin_trgm_ops);

-- The bank's topic filter dropdown (listDistinctTopics) and any
-- topic-filtered search both hit (workspace_id, topic) together - every
-- other query this table already serves filters on workspace_id first
-- (see findQuestionById, listQuestionsWithOptions, etc.), so this index
-- is additive to, not a replacement for, whatever workspace_id-only
-- index already exists.
CREATE INDEX IF NOT EXISTS questions_workspace_topic_idx
  ON questions (workspace_id, topic);
