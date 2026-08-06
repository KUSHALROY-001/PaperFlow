-- Settings page needs two things users doesn't have yet: a descriptive
-- account type (Student/Educator/Coaching Center - informational, NOT the
-- same concept as member_role which governs workspace permissions), and a
-- place to persist personal preferences (default output format, OCR
-- language, etc).

DO $$
BEGIN
  CREATE TYPE account_type AS ENUM ('student', 'educator', 'coaching_center');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_type account_type NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
