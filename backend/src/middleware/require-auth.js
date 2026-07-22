import { pool } from '../db/pool.js';
import { httpError } from '../lib/http-error.js';
import { verifyAccessToken } from '../lib/jwt.js';

export async function requireAuth(req, _res, next) {
  try {
    const header = req.get('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      throw httpError(401, 'Authentication token is required');
    }

    const payload = verifyAccessToken(token);
    const requestedWorkspaceId = req.get('x-workspace-id') || payload.workspaceId;

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        wm.workspace_id,
        wm.role
      FROM users u
      JOIN workspace_members wm ON wm.user_id = u.id
      WHERE u.id = $1
        AND u.is_active = TRUE
        AND ($2::uuid IS NULL OR wm.workspace_id = $2::uuid)
      ORDER BY wm.created_at ASC
      LIMIT 1
      `,
      [payload.sub, requestedWorkspaceId || null],
    );

    if (result.rowCount === 0) {
      throw httpError(401, 'Invalid or expired session');
    }

    const user = result.rows[0];
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    req.workspaceId = user.workspace_id;

    next();
  } catch (error) {
    next(error.statusCode ? error : httpError(401, 'Invalid or expired session'));
  }
}
