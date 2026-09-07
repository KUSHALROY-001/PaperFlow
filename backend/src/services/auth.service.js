import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import sharp from "sharp";
import { httpError } from "../lib/http-error.js";
import { signAccessToken } from "../lib/jwt.js";
import { verifyGoogleIdToken } from "../lib/google-oauth.js";
import { sendOtpEmail } from "../lib/brevo-mail.js";
import { requiredEnum, requiredString } from "../lib/validators.js";
import {
  buildAvatarPublicId,
  deleteAvatar as deleteAvatarFromCloudinary,
  isCloudinaryConfigured,
  resolveAvatarUrl,
  uploadAvatarBuffer,
} from "../lib/cloudinary-storage.js";
import * as authRepo from "../repositories/auth.repository.js";
import * as otpRepo from "../repositories/email-otp.repository.js";

const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

function buildAuthResponse(user, workspaceId) {
  const token = signAccessToken({ sub: user.id, workspaceId });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: resolveAvatarUrl({
        avatarPublicId: user.avatar_public_id,
        avatarUpdatedAt: user.avatar_updated_at,
        avatarUrl: user.avatar_url,
      }),
    },
    workspaceId,
  };
}

// --- Email verification (OTP via Brevo) -----------------------------------

// crypto.randomInt rather than Math.random() - a cryptographically
// predictable OTP would defeat the entire point of the code (same
// reasoning as api.js#getSubscriberKey on the frontend). padStart keeps
// a code like "4821" as "004821" instead of silently dropping the
// leading zeros and shipping a 4-digit code.
function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

// Shared by signup, login (when unverified), and resend-otp below - one
// code path that always hashes before storing, always uses the same TTL,
// and always sends through the same template, rather than three
// near-duplicate implementations drifting apart over time.
async function issueOtp(user) {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
  await otpRepo.createOtp(user.id, otpHash, expiresAt);
  await sendOtpEmail({ to: user.email, name: user.name, otp });
}

// Seconds remaining before another OTP may be sent to this user, or 0 if
// they're clear to send. Consulted by both login (to decide whether a
// fresh code is actually needed) and resendOtp (to reject with 429 when
// it isn't).
async function getResendCooldownRemaining(userId) {
  const latest = await otpRepo.findLatestOtp(userId);
  if (!latest) return 0;

  const elapsedMs = Date.now() - new Date(latest.created_at).getTime();
  const remainingMs = RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs;
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

export async function signup({ name, email, password }) {
  if (password.length < 8) {
    throw httpError(400, "Password must be at least 8 characters");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user;
  try {
    ({ user } = await authRepo.createUserWithWorkspace({
      name,
      email,
      passwordHash,
    }));
  } catch (error) {
    if (error.code === "23505") {
      throw httpError(409, "An account with this email already exists");
    }
    throw error;
  }

  try {
    await issueOtp(user);
  } catch (error) {
    // An account that can never receive its first code is dead weight -
    // roll the whole signup back (cascades to the workspace too, see
    // migrations/001_initial_schema.sql's owner_id ON DELETE CASCADE) so
    // the person gets a clear error and a clean slate to try again,
    // rather than a stuck, permanently-unverifiable account.
    console.error(
      `Failed to send signup verification email for user ${user.id}:`,
      error,
    );
    await authRepo.deleteUser(user.id);
    throw httpError(
      502,
      "Could not send the verification email. Please try again.",
    );
  }

  return { email: user.email, message: "Verification code sent" };
}

export async function verifyOtp({ email, otp }) {
  const user = await authRepo.findActiveUserByEmail(email);
  if (!user) {
    throw httpError(401, "Invalid email or verification code");
  }

  if (user.email_verified) {
    throw httpError(400, "This email is already verified");
  }

  const latest = await otpRepo.findLatestOtp(user.id);
  if (!latest || latest.consumed_at || new Date(latest.expires_at) < new Date()) {
    throw httpError(
      400,
      "This code has expired or is no longer valid. Request a new one.",
    );
  }

  if (latest.attempt_count >= latest.max_attempts) {
    throw httpError(
      429,
      "Too many incorrect attempts. Please request a new code.",
    );
  }

  const matches = await bcrypt.compare(otp, latest.otp_hash);
  if (!matches) {
    await otpRepo.incrementAttempt(latest.id);
    const attemptsLeft = latest.max_attempts - (latest.attempt_count + 1);
    throw httpError(
      400,
      attemptsLeft > 0
        ? `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`
        : "Incorrect code. Please request a new one.",
    );
  }

  await otpRepo.consumeOtp(latest.id);
  await otpRepo.markEmailVerified(user.id);

  const workspaceId = await authRepo.findFirstWorkspaceIdForUser(user.id);
  if (!workspaceId) {
    throw httpError(500, "User has no workspace");
  }

  await authRepo.touchLastLogin(user.id);

  return buildAuthResponse(user, workspaceId);
}

export async function resendOtp({ email }) {
  const user = await authRepo.findActiveUserByEmail(email);
  if (!user) {
    // Same reasoning as login's "Invalid email or password" - a distinct
    // "no account with that email" response here would let this endpoint
    // be used to enumerate which addresses have signed up.
    throw httpError(401, "Invalid email");
  }

  if (user.email_verified) {
    throw httpError(400, "This email is already verified");
  }

  const cooldownRemaining = await getResendCooldownRemaining(user.id);
  if (cooldownRemaining > 0) {
    throw httpError(
      429,
      `Please wait ${cooldownRemaining}s before requesting another code.`,
      { retryAfterSeconds: cooldownRemaining },
    );
  }

  try {
    await issueOtp(user);
  } catch (error) {
    console.error(`Failed to resend verification email for user ${user.id}:`, error);
    throw httpError(
      502,
      "Could not send the verification email. Please try again.",
    );
  }

  return { message: "Verification code resent" };
}

export async function listWorkspacesForUser(userId) {
  return authRepo.listWorkspacesForUser(userId);
}

// --- Settings page --------------------------------------------------------

const ACCOUNT_TYPES = ["student", "educator", "coaching_center"];

// Every profile-shaped response (getProfile, updateProfile, uploadAvatar,
// deleteAvatar below) needs the same transform: the three raw avatar_*
// columns collapse into the one URL that's actually displayed, plus a
// hasCustomAvatar flag so the frontend knows whether "Remove avatar" is a
// real action (a self-uploaded avatar exists to remove) or a no-op (only
// the Google photo, or nothing, is showing).
function shapeProfile(profile) {
  const { avatarUrl, avatarPublicId, avatarUpdatedAt, ...rest } = profile;
  return {
    ...rest,
    avatarUrl: resolveAvatarUrl({ avatarPublicId, avatarUpdatedAt, avatarUrl }),
    hasCustomAvatar: Boolean(avatarPublicId),
  };
}

export async function getProfile(userId) {
  const profile = await authRepo.findProfileById(userId);

  if (!profile) {
    throw httpError(404, "Account not found");
  }

  return shapeProfile(profile);
}

// Email is deliberately NOT accepted here - it's the account's login
// identity, and editing it had no re-authentication/verification step at
// all (unlike changePassword/deleteAccount below, both of which require the
// current password). If email changes are needed later, add them back
// behind the same password-confirmation pattern rather than accepting a
// bare new value on this endpoint.
export async function updateProfile(userId, body) {
  const name =
    body.name === undefined ? undefined : requiredString(body.name, "name");
  const accountType =
    body.accountType === undefined
      ? undefined
      : requiredEnum(body.accountType, ACCOUNT_TYPES, "accountType");

  const profile = await authRepo.updateProfile(userId, {
    name,
    accountType,
  });

  if (!profile) {
    throw httpError(404, "Account not found");
  }

  return shapeProfile(profile);
}

// Uploads/replaces the user's custom avatar. Always overwrites the same
// Cloudinary public_id (buildAvatarPublicId is keyed only on userId), so
// there's no separate "delete the old one first" step the way question
// diagrams need in some flows - the new upload simply replaces it in place.
export async function uploadAvatar(userId, file) {
  if (!file) {
    throw httpError(400, "Missing image file");
  }
  if (!file.buffer || file.buffer.length === 0) {
    throw httpError(400, "Uploaded file is empty");
  }
  // Fail fast with a clear message before any image work when Cloudinary
  // is missing from the environment - otherwise the user only sees a
  // generic 502 after sharp has already processed the file, same
  // reasoning as question-assets.controller.js#uploadDiagramImage.
  if (!isCloudinaryConfigured()) {
    throw httpError(
      503,
      "Cloud image storage (Cloudinary) is not configured on the server",
    );
  }

  let normalizedPng;
  try {
    // Re-encode through sharp rather than trusting the uploaded bytes as-is
    // - strips EXIF, normalizes to PNG regardless of whether the upload was
    // a JPEG/WEBP, and gives a clean 400 instead of a corrupt upload if
    // what came through fileFilter's mimetype check isn't actually a
    // decodable image. Cloudinary's own upload-time transformation (see
    // uploadAvatarBuffer) handles the square face-crop after this.
    normalizedPng = await sharp(file.buffer).png().toBuffer();
  } catch (error) {
    console.error("sharp failed to process uploaded avatar:", error);
    throw httpError(
      400,
      "Could not process this image. Use a valid PNG, JPEG, or WebP file",
    );
  }

  const publicId = buildAvatarPublicId(userId);

  try {
    await uploadAvatarBuffer(normalizedPng, publicId);
  } catch (error) {
    // uploadAvatarBuffer already maps Cloudinary failures to httpError(502).
    console.error(`uploadAvatar failed for user ${userId} (publicId=${publicId}):`, error);
    throw error;
  }

  let profile;
  try {
    profile = await authRepo.setAvatar(userId, publicId);
  } catch (error) {
    // Cloudinary already holds the new bytes under publicId - same
    // partial-success situation question-assets.controller.js#uploadDiagramImage
    // guards against, logged rather than silently swallowed.
    console.error(`Avatar uploaded to Cloudinary but DB update failed for user ${userId}:`, error);
    throw httpError(
      500,
      "Image was uploaded but could not be saved to your profile. Please try again",
    );
  }

  if (!profile) {
    throw httpError(404, "Account not found");
  }

  return shapeProfile(profile);
}

// Removes the custom avatar, reverting display back to avatar_url
// (Google's photo, or nothing for a password-only account that never
// uploaded one) - avatar_url itself is never touched by this.
export async function deleteAvatar(userId) {
  const current = await authRepo.findProfileById(userId);
  if (!current) {
    throw httpError(404, "Account not found");
  }

  if (current.avatarPublicId) {
    await deleteAvatarFromCloudinary(current.avatarPublicId);
  }

  const profile = await authRepo.clearAvatar(userId);
  if (!profile) {
    throw httpError(404, "Account not found");
  }

  return shapeProfile(profile);
}

export async function changePassword(userId, body) {
  const currentPassword = requiredString(
    body.currentPassword,
    "currentPassword",
  );
  const newPassword = requiredString(body.newPassword, "newPassword");

  if (newPassword.length < 8) {
    throw httpError(400, "New password must be at least 8 characters");
  }

  const row = await authRepo.findPasswordHashById(userId);
  if (!row) {
    throw httpError(404, "Account not found");
  }
  if (!row.password_hash) {
    // A Google-only account (migration 038_google_sign_in.sql) has never
    // had a password to begin with - "change" doesn't apply here, and
    // treating this the same as "account not found" (the old collapsed
    // null-or-null-hash behavior) would be actively misleading to someone
    // who's genuinely logged into a real account.
    throw httpError(
      400,
      "This account signed up with Google and has no password to change.",
    );
  }

  const currentMatches = await bcrypt.compare(
    currentPassword,
    row.password_hash,
  );
  if (!currentMatches) {
    throw httpError(401, "Current password is incorrect");
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await authRepo.updatePassword(userId, newHash);
}

// Requires the password again as confirmation of intent (standard for a
// destructive, irreversible action), and refuses if deleting this account
// would cascade-delete a workspace other people still depend on - see
// auth.repository.js#findOwnedWorkspacesWithOtherMembers for why that's
// possible at all.
export async function deleteAccount(userId, body) {
  const row = await authRepo.findPasswordHashById(userId);
  if (!row) {
    throw httpError(404, "Account not found");
  }

  if (row.password_hash) {
    const password = requiredString(body.password, "password");
    const passwordMatches = await bcrypt.compare(password, row.password_hash);
    if (!passwordMatches) {
      throw httpError(401, "Incorrect password");
    }
  }
  // else: a Google-only account (migration 038_google_sign_in.sql) has no
  // password to confirm with - the valid, already-checked JWT that got
  // this request past requireAuth in the first place IS the
  // authentication for this action. Requiring a `password` field that
  // structurally cannot exist for this account would just be a hard
  // block, not a real extra security step.

  const blockedWorkspaces =
    await authRepo.findOwnedWorkspacesWithOtherMembers(userId);
  if (blockedWorkspaces.length > 0) {
    const names = blockedWorkspaces.map((w) => w.name).join(", ");
    throw httpError(
      409,
      `You own ${blockedWorkspaces.length > 1 ? "workspaces" : "a workspace"} with other members (${names}). Remove those members or transfer ownership before deleting your account.`,
    );
  }

  await authRepo.deleteUser(userId);
}

export async function login({ email, password }) {
  const user = await authRepo.findActiveUserByEmail(email);

  if (!user) {
    throw httpError(401, "Invalid email or password");
  }

  if (!user.password_hash) {
    // A Google-only account trying the password form - "Invalid email or
    // password" here would be technically true but actively unhelpful;
    // telling them how they actually signed up gets them unstuck instead
    // of leaving them guessing at a password that was never set.
    throw httpError(
      401,
      "This account uses Google Sign-In - use the Google button instead",
    );
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    throw httpError(401, "Invalid email or password");
  }

  if (!user.email_verified) {
    // Only send a fresh code if the last one isn't still within its
    // resend cooldown - otherwise repeatedly hitting "log in" with a
    // correct password would spam the inbox faster than resendOtp's own
    // cooldown would ever allow. Either way, no token: this account
    // isn't "activated" yet (see migrations/044_email_otp_verification.sql).
    const cooldownRemaining = await getResendCooldownRemaining(user.id);
    if (cooldownRemaining <= 0) {
      try {
        await issueOtp(user);
      } catch (error) {
        console.error(
          `Failed to send verification email during login for user ${user.id}:`,
          error,
        );
        // Don't fail the whole login attempt over a transient email-send
        // error here - the person may still have a still-valid code from
        // an earlier send, and can always hit "resend" on the verify
        // screen (which surfaces its own send failures directly).
      }
    }

    throw httpError(403, "Please verify your email to continue", {
      emailVerificationRequired: true,
      email: user.email,
    });
  }

  const workspaceId = await authRepo.findFirstWorkspaceIdForUser(user.id);

  if (!workspaceId) {
    throw httpError(500, "User has no workspace");
  }

  await authRepo.touchLastLogin(user.id);

  return buildAuthResponse(user, workspaceId);
}

// Shared by both the signup and login Google buttons on AuthPage.jsx -
// there's no meaningful difference between "sign up" and "log in" once
// you're verifying a Google identity: either an account for this Google
// user already exists (log them in) or it doesn't (create one), and the
// button the person happened to click doesn't change that outcome.
export async function googleAuth({ credential }) {
  const payload = await verifyGoogleIdToken(credential);

  if (!payload.email_verified) {
    // Google itself flags unverified emails - trusting one here would
    // mean anyone could claim an email address they don't actually
    // control just by creating a Google account with it.
    throw httpError(401, "Google account email is not verified");
  }

  const email = payload.email.toLowerCase();
  let user = await authRepo.findActiveUserByGoogleId(payload.sub);
  let workspaceId;

  if (user) {
    workspaceId = await authRepo.findFirstWorkspaceIdForUser(user.id);
  } else {
    const existing = await authRepo.findActiveUserByEmail(email);
    if (existing) {
      // Same (Google-verified) email already has a password-based
      // account - link Google onto it as an additional sign-in method
      // instead of creating a second, disconnected account that happens
      // to share an email address with the first.
      await authRepo.linkGoogleIdToUser(
        existing.id,
        payload.sub,
        payload.picture || null,
      );
      // existing was fetched BEFORE the link/backfill above, so its
      // avatar_url is still stale for this one in-memory object (the DB
      // itself is already correct) - apply the same COALESCE the SQL
      // used so buildAuthResponse below shows the newly-linked avatar
      // immediately, rather than only from the next /api/auth/me call.
      user = {
        ...existing,
        avatar_url: existing.avatar_url ?? payload.picture ?? null,
      };
      workspaceId = await authRepo.findFirstWorkspaceIdForUser(user.id);
    } else {
      const created = await authRepo.createUserWithWorkspaceFromGoogle({
        name: payload.name || email.split("@")[0],
        email,
        googleId: payload.sub,
        avatarUrl: payload.picture || null,
      });
      user = created.user;
      workspaceId = created.workspaceId;
    }
  }

  if (!workspaceId) {
    throw httpError(500, "User has no workspace");
  }

  await authRepo.touchLastLogin(user.id);

  return buildAuthResponse(user, workspaceId);
}
