import { pool } from "../db/pool.js";

export async function findActiveUserByEmail(email) {
  const result = await pool.query(
    `
    SELECT id, name, email, password_hash
    FROM users
    WHERE email = $1
      AND is_active = TRUE
    `,
    [email],
  );

  return result.rows[0] || null;
}

// Google's stable per-account identifier (the ID token's "sub" claim) -
// never the email, which can change on Google's side independently of
// this app ever knowing. See migration 038_google_sign_in.sql.
export async function findActiveUserByGoogleId(googleId) {
  const result = await pool.query(
    `
    SELECT id, name, email, password_hash
    FROM users
    WHERE google_id = $1
      AND is_active = TRUE
    `,
    [googleId],
  );

  return result.rows[0] || null;
}

// Links a Google account onto an EXISTING user - reached when someone
// with a password-based account signs in with Google using the same
// (Google-verified) email address, rather than ending up with two
// separate, disconnected accounts for the same person. Does not touch
// password_hash - a linked account can still log in either way afterward.
export async function linkGoogleIdToUser(userId, googleId) {
  await pool.query("UPDATE users SET google_id = $2 WHERE id = $1", [
    userId,
    googleId,
  ]);
}

export async function findFirstWorkspaceIdForUser(userId) {
  const result = await pool.query(
    `
    SELECT workspace_id
    FROM workspace_members
    WHERE user_id = $1
    ORDER BY created_at ASC
    LIMIT 1
    `,
    [userId],
  );

  return result.rows[0]?.workspace_id || null;
}

// Powers the workspace switcher and GET /api/auth/me - a user can belong to
// more than one workspace (their own, plus any they've accepted an
// invitation into), and the frontend needs to know all of them plus the
// role held in each, not just the currently-active one.
export async function listWorkspacesForUser(userId) {
  const result = await pool.query(
    `
    SELECT
      w.id,
      w.name,
      wm.role,
      w.owner_id = $1 AS "isOwner"
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = $1
    ORDER BY wm.created_at ASC
    `,
    [userId],
  );

  return result.rows;
}

export async function touchLastLogin(userId) {
  await pool.query("UPDATE users SET last_login_at = now() WHERE id = $1", [
    userId,
  ]);
}

// --- Settings page --------------------------------------------------------

const PROFILE_COLUMNS = `
  id,
  name,
  email,
  account_type AS "accountType",
  created_at AS "createdAt"
`;

export async function findProfileById(userId) {
  const result = await pool.query(
    `SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1`,
    [userId],
  );
  return result.rows[0] || null;
}

export async function updateProfile(userId, { name, accountType }) {
  const result = await pool.query(
    `
    UPDATE users
    SET
      name = COALESCE($2, name),
      account_type = COALESCE($3, account_type)
    WHERE id = $1
    RETURNING ${PROFILE_COLUMNS}
    `,
    [userId, name ?? null, accountType ?? null],
  );

  return result.rows[0] || null;
}

// Returns null when there's no such user at all, or { password_hash }
// (password_hash itself possibly null, for a Google-only account with no
// password ever set - see migration 038_google_sign_in.sql) when the user
// exists. Callers (changePassword/deleteAccount below) need to tell these
// two cases apart - collapsing both to a single null return here (the
// previous behavior) meant a Google-only user's very real account looked
// indistinguishable from a nonexistent one, surfacing as a misleading
// 404 "Account not found" for someone who was, in fact, logged into a
// real account.
export async function findPasswordHashById(userId) {
  const result = await pool.query(
    "SELECT password_hash FROM users WHERE id = $1",
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function updatePassword(userId, passwordHash) {
  await pool.query("UPDATE users SET password_hash = $2 WHERE id = $1", [
    userId,
    passwordHash,
  ]);
}

// Deleting a user cascades to any workspace they own (workspaces.owner_id
// ON DELETE CASCADE) - if that workspace has other members, deleting your
// own account would silently destroy a shared workspace out from under
// your team. This surfaces that risk so the service layer can block it
// rather than let it happen implicitly.
export async function findOwnedWorkspacesWithOtherMembers(userId) {
  const result = await pool.query(
    `
    SELECT w.id, w.name
    FROM workspaces w
    WHERE w.owner_id = $1
      AND (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) > 1
    `,
    [userId],
  );

  return result.rows;
}

export async function deleteUser(userId) {
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
}

// Creates the user, a personal workspace, and the owner membership row in a
// single transaction. Returns { user, workspaceId }.
export async function createUserWithWorkspace({ name, email, passwordHash }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email
      `,
      [name, email, passwordHash],
    );
    const user = userResult.rows[0];

    const workspaceResult = await client.query(
      `
      INSERT INTO workspaces (name, owner_id)
      VALUES ($1, $2)
      RETURNING id
      `,
      [`${name}'s Workspace`, user.id],
    );
    const workspaceId = workspaceResult.rows[0].id;

    await client.query(
      `
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, 'owner')
      `,
      [workspaceId, user.id],
    );

    await client.query("COMMIT");
    return { user, workspaceId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Google-account counterpart to createUserWithWorkspace above - same
// transaction shape (user row, then their own workspace, then owner
// membership), just with password_hash left NULL and google_id/avatar_url
// set instead. Kept as a separate function rather than an optional-param
// branch on the original: the two have different required fields
// (password vs googleId) and mixing them would make it possible to call
// createUserWithWorkspace with neither a password nor a googleId by
// accident, silently violating the users_has_auth_method constraint at
// the DB layer instead of failing clearly here.
export async function createUserWithWorkspaceFromGoogle({
  name,
  email,
  googleId,
  avatarUrl,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
      INSERT INTO users (name, email, google_id, avatar_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email
      `,
      [name, email, googleId, avatarUrl],
    );
    const user = userResult.rows[0];

    const workspaceResult = await client.query(
      `
      INSERT INTO workspaces (name, owner_id)
      VALUES ($1, $2)
      RETURNING id
      `,
      [`${name}'s Workspace`, user.id],
    );
    const workspaceId = workspaceResult.rows[0].id;

    await client.query(
      `
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, 'owner')
      `,
      [workspaceId, user.id],
    );

    await client.query("COMMIT");
    return { user, workspaceId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
