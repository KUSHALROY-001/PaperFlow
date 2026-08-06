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
const OUTPUT_FORMATS = ["Mock Test", "Question Bank", "Study Notes Extraction"];
const OCR_LANGUAGES = ["English", "Hindi", "Bengali"];

export async function getProfile(userId) {
  const profile = await authRepo.findProfileById(userId);

  if (!profile) {
    throw httpError(404, "Account not found");
  }

  return profile;
}

export async function updateProfile(userId, body) {
  const name =
    body.name === undefined ? undefined : requiredString(body.name, "name");
  const email =
    body.email === undefined
      ? undefined
      : requiredString(body.email, "email").toLowerCase();
  const accountType =
    body.accountType === undefined
      ? undefined
      : requiredEnum(body.accountType, ACCOUNT_TYPES, "accountType");

  try {
    const profile = await authRepo.updateProfile(userId, {
      name,
      email,
      accountType,
    });

    if (!profile) {
      throw httpError(404, "Account not found");
    }

    return profile;
  } catch (error) {
    if (error.code === "23505") {
      throw httpError(409, "That email is already in use by another account");
    }
    throw error;
  }
}

// Preferences are stored, but nothing downstream reads them yet - the
// upload flow doesn't auto-apply defaultOutputFormat/ocrLanguage, and
// autoApprove/emailNotifications aren't consumed by the worker or by any
// email provider (there isn't one - see team.service.js#createInvitation
// for the same caveat). This endpoint is honest about persisting the
// values; wiring them into actual behavior is separate, later work.
export async function updatePreferences(userId, body) {
  const patch = {};

  if (body.defaultOutputFormat !== undefined) {
    patch.defaultOutputFormat = requiredEnum(
      body.defaultOutputFormat,
      OUTPUT_FORMATS,
      "defaultOutputFormat",
    );
  }
  if (body.ocrLanguage !== undefined) {
    patch.ocrLanguage = requiredEnum(
      body.ocrLanguage,
      OCR_LANGUAGES,
      "ocrLanguage",
    );
  }
  if (body.autoApprove !== undefined) {
    patch.autoApprove = Boolean(body.autoApprove);
  }
  if (body.emailNotifications !== undefined) {
    patch.emailNotifications = Boolean(body.emailNotifications);
  }

  return authRepo.mergePreferences(userId, patch);
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
