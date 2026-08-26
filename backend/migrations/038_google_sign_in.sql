-- Enables Google Sign-In (auth.service.js#googleAuth). A Google-only
-- account never sets a password at all, so password_hash - previously
-- NOT NULL, correct back when password was the only sign-in method - has
-- to become optional. google_id (Google's stable per-account "sub" claim,
-- never the email - an email can change on Google's side, sub never does)
-- is the new identifier for those accounts.
--
-- The CHECK constraint is what keeps this safe rather than just
-- permissive: a user must always have at least one real way to sign in.
-- Without it, a bug anywhere in the signup/link path could silently
-- create a user with neither a password nor a linked Google account -
-- permanently locked out with no error ever surfacing, since there'd be
-- nothing to notice was missing until they tried to log in.
ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL,
  ADD COLUMN google_id TEXT UNIQUE,
  ADD CONSTRAINT users_has_auth_method
    CHECK (password_hash IS NOT NULL OR google_id IS NOT NULL);
