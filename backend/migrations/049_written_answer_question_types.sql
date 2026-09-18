-- Adds the non-MCQ question types this app will support, alongside the
-- existing 'single'/'multi' (both MCQ variants - see 001_initial_schema.sql).
-- This migration ONLY adds enum values and does nothing else, deliberately:
-- Postgres forbids using a newly added enum value - in a CHECK constraint,
-- a comparison, a DEFAULT, anything - within the same transaction that
-- added it ("unsafe use of new value"), unless the enum TYPE itself was
-- also created in that same transaction, which question_type was not (it
-- dates back to migration 001). This project's migration runner
-- (src/db/migrate.js) wraps each file in its own single transaction, so
-- any statement that actually USES these values (the type-conditioned
-- CHECK constraint on question_contents, etc.) has to live in a later
-- migration file, applied in its own separate transaction - see
-- 050_written_answer_columns.sql.
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'fill_blank';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'short_answer';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'long_answer';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'numerical';
