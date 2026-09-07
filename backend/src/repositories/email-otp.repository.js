import { pool } from "../db/pool.js";

const MAX_ATTEMPTS = 5;

// Every OTP request inserts a fresh row rather than updating one in
// place - see migrations/044_email_otp_verification.sql for why that
// alone is what makes "invalidate the old OTP" free (nothing looks at
// anything but the latest row).
export async function createOtp(userId, otpHash, expiresAt) {
  const result = await pool.query(
    `
    INSERT INTO email_otps (user_id, otp_hash, expires_at, max_attempts)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, otp_hash, expires_at, attempt_count, max_attempts, consumed_at, created_at
    `,
    [userId, otpHash, expiresAt, MAX_ATTEMPTS],
  );
  return result.rows[0];
}

export async function findLatestOtp(userId) {
  const result = await pool.query(
    `
    SELECT id, user_id, otp_hash, expires_at, attempt_count, max_attempts, consumed_at, created_at
    FROM email_otps
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [userId],
  );
  return result.rows[0] || null;
}

export async function incrementAttempt(otpId) {
  await pool.query(
    "UPDATE email_otps SET attempt_count = attempt_count + 1 WHERE id = $1",
    [otpId],
  );
}

export async function consumeOtp(otpId) {
  await pool.query("UPDATE email_otps SET consumed_at = now() WHERE id = $1", [
    otpId,
  ]);
}

export async function markEmailVerified(userId) {
  await pool.query("UPDATE users SET email_verified = TRUE WHERE id = $1", [
    userId,
  ]);
}
