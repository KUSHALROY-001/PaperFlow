-- Duplicate question detection. worker/reconcile.py already merges AI +
-- regex extractions of the SAME page, but nothing catches the same
-- question reappearing across DIFFERENT PDF uploads - which is exactly
-- what happens with a reused topic bank year over year, or the same
-- coaching-institute PDF processed twice into two different mock tests.
--
-- Trigram similarity, not exact-text matching: two extractions of "the
-- same" question rarely come out byte-identical (OCR noise, reformatted
-- whitespace, a re-run of the AI cleanup pass phrasing things slightly
-- differently) - fuzzy string similarity is the right tool, and full
-- embeddings would be overkill for what's fundamentally a string-distance
-- problem over relatively short text.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Makes similarity(question_text, ...) and the % operator index-accelerated
-- instead of a sequential scan across every question in the workspace for
-- every comparison - this is what makes worker/duplicate_detector.py's
-- candidate-filtering query (`a.question_text % b.question_text`) fast.
CREATE INDEX IF NOT EXISTS questions_text_trgm_idx
  ON questions USING GIN (question_text gin_trgm_ops);

-- A real table rather than computing similarity live on every page load,
-- for two reasons: (a) an O(n^2) trigram scan across thousands of
-- questions is too slow to run synchronously on a page request - see
-- worker/duplicate_detector.py, which runs this as a batch job instead;
-- (b) once a reviewer dismisses a pair as "not actually duplicates" (two
-- genuinely different questions that happen to share boilerplate
-- phrasing), that decision has to persist and never resurface on the next
-- detection run - a live query has no memory of that, a stored row does.
CREATE TABLE IF NOT EXISTS question_duplicate_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  question_id_a UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_id_b UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  similarity_score NUMERIC(5,4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'dismissed')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  -- Forces a single canonical ordering (always store the lexicographically
  -- smaller id as _a) so the same pair detected from either direction
  -- (a,b) or (b,a) collides on the same row instead of being stored
  -- twice - required for the unique index below to actually do its job.
  CHECK (question_id_a < question_id_b)
);

-- The detection job's ON CONFLICT (question_id_a, question_id_b) DO NOTHING
-- target - lets duplicate_detector.py re-run over the same candidate pair
-- on every subsequent job without erroring or inserting a second row for
-- something already pending/confirmed/dismissed.
CREATE UNIQUE INDEX IF NOT EXISTS question_duplicate_pairs_pair_idx
  ON question_duplicate_pairs (question_id_a, question_id_b);

-- The review queue's core query: "give me this workspace's pending pairs,
-- most-similar first."
CREATE INDEX IF NOT EXISTS question_duplicate_pairs_workspace_status_idx
  ON question_duplicate_pairs (workspace_id, status)
  WHERE status = 'pending';
