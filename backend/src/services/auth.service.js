import bcrypt from "bcryptjs";
import { httpError } from "../lib/http-error.js";
import { signAccessToken } from "../lib/jwt.js";
import { verifyGoogleIdToken } from "../lib/google-oauth.js";
import { requiredEnum, requiredString } from "../lib/validators.js";
import * as authRepo from "../repositories/auth.repository.js";

function buildAuthResponse(user, workspaceId) {
  const token = signAccessToken({ sub: user.id, workspaceId });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email },
    workspaceId,
  };
}

export async function signup({ name, email, password }) {
  if (password.length < 8) {
    throw httpError(400, "Password must be at least 8 characters");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const { user, workspaceId } = await authRepo.createUserWithWorkspace({
      name,
      email,
      passwordHash,
    });
    return buildAuthResponse(user, workspaceId);
  } catch (error) {
    if (error.code === "23505") {
      throw httpError(409, "An account with this email already exists");
    }
    throw error;
  }
}

export async function listWorkspacesForUser(userId) {
  return authRepo.listWorkspacesForUser(userId);
}

// --- Settings page --------------------------------------------------------

const ACCOUNT_TYPES = ["student", "educator", "coaching_center"];

export async function getProfile(userId) {
  const profile = await authRepo.findProfileById(userId);

  if (!profile) {
    throw httpError(404, "Account not found");
  }

  return profile;
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

  return profile;
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
      await authRepo.linkGoogleIdToUser(existing.id, payload.sub);
      user = existing;
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
