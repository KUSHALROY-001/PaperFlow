import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../lib/async-handler.js';
import { httpError } from '../lib/http-error.js';
import { signAccessToken } from '../lib/jwt.js';
import { requiredString } from '../lib/validators.js';
import { requireAuth } from '../middleware/require-auth.js';

export const authRouter = Router();

function authResponse(user, workspaceId) {
  const token = signAccessToken({
    sub: user.id,
    workspaceId,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    workspaceId,
  };
}

authRouter.post('/signup', asyncHandler(async (req, res) => {
  const name = requiredString(req.body.name, 'name');
  const email = requiredString(req.body.email, 'email').toLowerCase();
  const password = requiredString(req.body.password, 'password');

  if (password.length < 8) {
    throw httpError(400, 'Password must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

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

    await client.query('COMMIT');
    res.status(201).json(authResponse(user, workspaceId));
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      throw httpError(409, 'An account with this email already exists');
    }
    throw error;
  } finally {
    client.release();
  }
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const email = requiredString(req.body.email, 'email').toLowerCase();
  const password = requiredString(req.body.password, 'password');

  const userResult = await pool.query(
    `
    SELECT id, name, email, password_hash
    FROM users
    WHERE email = $1
      AND is_active = TRUE
    `,
    [email],
  );

  if (userResult.rowCount === 0) {
    throw httpError(401, 'Invalid email or password');
  }

  const user = userResult.rows[0];
  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    throw httpError(401, 'Invalid email or password');
  }

  const workspaceResult = await pool.query(
    `
    SELECT workspace_id
    FROM workspace_members
    WHERE user_id = $1
    ORDER BY created_at ASC
    LIMIT 1
    `,
    [user.id],
  );

  if (workspaceResult.rowCount === 0) {
    throw httpError(500, 'User has no workspace');
  }

  await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  res.json(authResponse(user, workspaceResult.rows[0].workspace_id));
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({
    user: req.user,
    workspaceId: req.workspaceId,
  });
}));
