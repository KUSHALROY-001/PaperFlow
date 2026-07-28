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

export async function touchLastLogin(userId) {
  await pool.query("UPDATE users SET last_login_at = now() WHERE id = $1", [
    userId,
  ]);
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
