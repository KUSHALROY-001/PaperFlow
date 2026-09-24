-- Adds a JSONB column that tracks each user's progress through the
-- in-app product guide (see frontend/src/guide/). Existing users are
-- marked as having already seen the auto-start welcome tour so it does
-- not get forced on people who already know the product; only brand
-- new signups get an empty object and therefore see the tour on first
-- login.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE users
SET onboarding = '{"autoStartSeen": true}'::jsonb
WHERE onboarding = '{}'::jsonb;
