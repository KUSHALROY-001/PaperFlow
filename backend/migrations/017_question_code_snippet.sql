-- Fixes a second code-formatting bug: has_code/code_language (012) are a
-- single boolean+language pair applied to the WHOLE `text` field, with no
-- way to say "only part of this is code". A question like "What will be
-- output of the following code snippet? <code>" had its entire text -
-- prose intro included - rendered inside the monospace <pre><code> box
-- (QuestionContent.jsx's hasCode branch), because that box has nothing
-- else to draw from.
--
-- code_snippet holds ONLY the literal code, verbatim, when has_code is
-- true. `text` keeps its existing meaning (the full question as before)
-- for legacy rows and as a fallback, but going forward worker/ai puts
-- just the prose lead-in in `text` and just the code in `code_snippet`,
-- so QuestionContent.jsx can render the two separately: prose as normal
-- text, code in the box. NULL code_snippet on an existing has_code=true
-- row means "extracted before this migration" - QuestionContent.jsx falls
-- back to its old behavior (whole `text` in the code box) for those,
-- since there's nothing to split them with after the fact.
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS code_snippet TEXT;

-- Mirrors 013_playable_questions_code_fields.sql exactly: the exam-play
-- screen reads this view, not `questions` directly, so it needs its own
-- copy of the new column or it silently never reaches the exam-taking UI.
DROP VIEW IF EXISTS playable_mock_test_questions;

CREATE VIEW playable_mock_test_questions AS
SELECT
  q.id AS "questionId",
  q.mock_test_id,
  q.question_no AS "questionNo",
  q.topic,
  q.question_text AS text,
  COALESCE(
    (
      SELECT jsonb_agg(qo.option_text ORDER BY qo.option_index)
      FROM question_options qo
      WHERE qo.question_id = q.id
    ),
    '[]'::jsonb
  ) AS options,
  to_jsonb(q.correct_option_indexes) AS "correctOptionIndex",
  q.question_type AS "questionType",
  q.explanation,
  q.has_code AS "hasCode",
  q.code_language AS "codeLanguage",
  q.code_snippet AS "codeSnippet"
FROM questions q
ORDER BY q.mock_test_id, q.question_no;
