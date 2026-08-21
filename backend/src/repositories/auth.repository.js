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

export async function findPasswordHashById(userId) {
  const result = await pool.query(
    "SELECT password_hash FROM users WHERE id = $1",
    [userId],
  );
  return result.rows[0]?.password_hash || null;
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
