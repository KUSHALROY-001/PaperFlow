-- Email verification via one-time codes sent through Brevo
-- (auth.service.js#signup / #verifyOtp / #resendOtp).
--
-- Existing users are NOT backfilled as verified - every account
-- (password-based, created before or after this migration) must pass
-- through OTP verification on its next signup/login. Google-authenticated
-- accounts are the one exception: Google already verifies the email
-- address itself at OAuth time (see googleAuth's payload.email_verified
-- check), so a second, redundant email-OTP step would add friction
-- without adding security.
ALTER TABLE users
  ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users SET email_verified = TRUE WHERE google_id IS NOT NULL;

-- One row per OTP *sent*, never updated in place except to bump
-- attempt_count or stamp consumed_at. Verification and the resend
-- cooldown both only ever look at the most recent row for a user
-- (see email-otp.repository.js#findLatestOtp), so generating a new code
-- implicitly invalidates whatever code came before it - there's no
-- separate "invalidate" step needed.
CREATE TABLE IF NOT EXISTS email_otps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash      TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts  INT NOT NULL DEFAULT 5,
  consumed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Powers findLatestOtp's "most recent row for this user" lookup.
CREATE INDEX IF NOT EXISTS idx_email_otps_user_id_created_at
  ON email_otps (user_id, created_at DESC);
