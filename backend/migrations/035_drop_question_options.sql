-- Migration 035: Drop legacy question_options table
--
-- Since Migration 032 (032_question_content_options.sql), question options are
-- stored directly as a JSONB array on question_contents.options.
-- The question_options table was kept as a safety copy during Phase 1. Now that
-- question_contents.options is verified and active across all application code
-- and views, drop the legacy question_options table for a clean slate.

DROP TABLE IF EXISTS question_options;
