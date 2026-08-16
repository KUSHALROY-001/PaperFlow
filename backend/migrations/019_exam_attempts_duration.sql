-- Topic-wise practice sessions get a shorter attempt than the full mock
-- test (see attempts.service.js#computeSessionDurationMinutes) - persist
-- whatever duration a session actually started with, rather than the
-- response always re-deriving "the whole mock test's configured
-- duration" via a JOIN against mock_tests. Without this, a 10-question
-- topic practice pulled from a 90-question/180-minute mock test got the
-- full 180 minutes on the clock instead of a duration scaled to its own
-- question count.
--
-- Nullable: existing attempt rows predate this and have no
-- session-specific duration recorded - callers fall back to
-- mock_tests.duration_minutes for those (see the COALESCE-style fallback
-- in attempts.repository.js's findAttemptById/findAttemptByIdForUser/
-- listAttemptsForUser, and attempts.service.js#startAttempt).
ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS duration_minutes INT;
