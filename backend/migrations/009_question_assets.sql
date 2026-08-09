-- Question diagram/figure storage (Phase 3.3 of the diagram-rendering plan).
--
-- A dedicated table rather than a column on `questions`, deliberately, even
-- though today it's one crop per question: it costs nothing now and avoids
-- a second migration later if a question ever needs more than one image (a
-- multi-part figure, or a table treated as an asset too, matching the
-- original document's own "tables" and "images" categories).

CREATE TABLE IF NOT EXISTS question_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL DEFAULT 'diagram', -- room for 'table'/'graph' later without a new table
  storage_path TEXT NOT NULL,
  page_number INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS question_assets_question_id_idx ON question_assets (question_id);
