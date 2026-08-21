import bcrypt from "bcryptjs";
import { httpError } from "../lib/http-error.js";
import { signAccessToken } from "../lib/jwt.js";
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

  const passwordHash = await authRepo.findPasswordHashById(userId);
  if (!passwordHash) {
    throw httpError(404, "Account not found");
  }

  const currentMatches = await bcrypt.compare(currentPassword, passwordHash);
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
  const password = requiredString(body.password, "password");

  const passwordHash = await authRepo.findPasswordHashById(userId);
  if (!passwordHash) {
    throw httpError(404, "Account not found");
  }

  const passwordMatches = await bcrypt.compare(password, passwordHash);
  if (!passwordMatches) {
    throw httpError(401, "Incorrect password");
  }

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
