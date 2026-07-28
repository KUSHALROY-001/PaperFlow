import bcrypt from "bcryptjs";
import { httpError } from "../lib/http-error.js";
import { signAccessToken } from "../lib/jwt.js";
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
