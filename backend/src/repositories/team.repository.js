import { pool } from "../db/pool.js";

// Explicit projection, camelCase-aliased, same convention as
// extraction-templates.repository.js. clustersCreated is a real derived
// count (clusters.created_by), not a stored/hand-edited number.
const MEMBER_COLUMNS = `
  wm.id,
  wm.workspace_id AS "workspaceId",
  wm.user_id AS "userId",
  u.name,
  u.email,
  u.avatar_url AS "avatarUrl",
  u.avatar_public_id AS "avatarPublicId",
  u.avatar_updated_at AS "avatarUpdatedAt",
  wm.role,
  wm.created_at AS "joinedAt",
  (
    SELECT COUNT(*)::int
    FROM clusters c
    WHERE c.workspace_id = wm.workspace_id
      AND c.created_by = wm.user_id
  ) AS "clustersCreated"
`;

export async function listMembers(workspaceId) {
  const result = await pool.query(
    `
    SELECT ${MEMBER_COLUMNS}
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = $1
    ORDER BY
      CASE wm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'editor' THEN 2 ELSE 3 END,
      wm.created_at ASC
    `,
    [workspaceId],
  );

  return result.rows;
}

export async function findMemberById(memberId, workspaceId) {
  const result = await pool.query(
    `
    SELECT ${MEMBER_COLUMNS}
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.id = $1 AND wm.workspace_id = $2
    `,
    [memberId, workspaceId],
  );

  return result.rows[0] || null;
}

export async function updateMemberRole(memberId, workspaceId, role) {
  const result = await pool.query(
    `
    UPDATE workspace_members
    SET role = $3
    WHERE id = $1 AND workspace_id = $2
    RETURNING id
    `,
    [memberId, workspaceId, role],
  );

  return result.rowCount > 0;
}

export async function deleteMember(memberId, workspaceId) {
  const result = await pool.query(
    "DELETE FROM workspace_members WHERE id = $1 AND workspace_id = $2 RETURNING id",
    [memberId, workspaceId],
  );

  return result.rowCount > 0;
}

export async function findMembershipByUserAndWorkspace(userId, workspaceId) {
  const result = await pool.query(
    "SELECT id, role FROM workspace_members WHERE user_id = $1 AND workspace_id = $2",
    [userId, workspaceId],
  );

  return result.rows[0] || null;
}

// --- Invitations ------------------------------------------------------------

const INVITATION_COLUMNS = `
  wi.id,
  wi.workspace_id AS "workspaceId",
  wi.email,
  wi.role,
  wi.status,
  wi.token,
  wi.expires_at AS "expiresAt",
  wi.accepted_at AS "acceptedAt",
  wi.created_at AS "createdAt",
  inviter.name AS "invitedByName",
  inviter.avatar_url AS "invitedByAvatarUrl",
  inviter.avatar_public_id AS "invitedByAvatarPublicId",
  inviter.avatar_updated_at AS "invitedByAvatarUpdatedAt"
`;
export async function listPendingInvitations(workspaceId) {
  const result = await pool.query(
    `
    SELECT ${INVITATION_COLUMNS}
    FROM workspace_invitations wi
    LEFT JOIN users inviter ON inviter.id = wi.invited_by
    WHERE wi.workspace_id = $1
      AND wi.status = 'pending'
    ORDER BY wi.created_at DESC
    `,
    [workspaceId],
  );

  return result.rows;
}

// Invitations addressed to this email, across every workspace - not scoped
// to req.workspaceId, since the whole point is surfacing invites to
// workspaces the user isn't a member of yet. Powers the dedicated "invites
// sent to me" section rather than reusing the workspace-scoped list above.
export async function listInvitationsForEmail(email) {
  const result = await pool.query(
    `
    SELECT ${INVITATION_COLUMNS}, w.name AS "workspaceName"
    FROM workspace_invitations wi
    JOIN workspaces w ON w.id = wi.workspace_id
    LEFT JOIN users inviter ON inviter.id = wi.invited_by
    WHERE wi.email = $1
      AND wi.status = 'pending'
    ORDER BY wi.created_at DESC
    `,
    [email],
  );

  return result.rows;
}

// Upserts against the partial unique index (workspace_id, email) WHERE
// status = 'pending' - re-inviting the same still-pending email refreshes
// token/role/expiry on the same row instead of creating a duplicate.
export async function upsertInvitation({
  workspaceId,
  email,
  role,
  token,
  expiresAt,
  invitedBy,
}) {
  const result = await pool.query(
    `
    INSERT INTO workspace_invitations (workspace_id, email, role, token, expires_at, invited_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (workspace_id, email) WHERE status = 'pending'
    DO UPDATE SET
      role = EXCLUDED.role,
      token = EXCLUDED.token,
      expires_at = EXCLUDED.expires_at,
      invited_by = EXCLUDED.invited_by
    RETURNING id, workspace_id AS "workspaceId", email, role, token, expires_at AS "expiresAt"
    `,
    [workspaceId, email, role, token, expiresAt, invitedBy],
  );

  return result.rows[0];
}

export async function findInvitationById(invitationId, workspaceId) {
  const result = await pool.query(
    `SELECT ${INVITATION_COLUMNS} FROM workspace_invitations wi
     LEFT JOIN users inviter ON inviter.id = wi.invited_by
     WHERE wi.id = $1 AND wi.workspace_id = $2`,
    [invitationId, workspaceId],
  );

  return result.rows[0] || null;
}

export async function revokeInvitation(invitationId, workspaceId) {
  const result = await pool.query(
    `
    UPDATE workspace_invitations
    SET status = 'revoked'
    WHERE id = $1 AND workspace_id = $2 AND status = 'pending'
    RETURNING id
    `,
    [invitationId, workspaceId],
  );

  return result.rowCount > 0;
}

// client-scoped so acceptInvitation (service layer) can run the lookup and
// the membership insert inside one transaction - same reasoning as
// extraction-templates' applyTemplate.
export async function findPendingInvitationByToken(token, client = pool) {
  const result = await client.query(
    `SELECT id, workspace_id AS "workspaceId", email, role, status, expires_at AS "expiresAt"
     FROM workspace_invitations
     WHERE token = $1`,
    [token],
  );

  return result.rows[0] || null;
}

export async function markInvitationAccepted(client, invitationId) {
  await client.query(
    `UPDATE workspace_invitations SET status = 'accepted', accepted_at = now() WHERE id = $1`,
    [invitationId],
  );
}

// ON CONFLICT DO NOTHING covers the case where the invited person is
// somehow already a member (e.g. accepted once, invite link reused) -
// idempotent rather than a 500 on a duplicate (workspace_id, user_id).
export async function insertMemberFromInvitation(
  client,
  { workspaceId, userId, role },
) {
  const result = await client.query(
    `
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (workspace_id, user_id) DO NOTHING
    RETURNING id
    `,
    [workspaceId, userId, role],
  );

  return result.rows[0] || null;
}
