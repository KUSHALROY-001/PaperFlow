-- Team page needs two things: managing existing workspace_members (already
-- in 001_initial_schema.sql - no schema change needed for that half), and
-- inviting people who may not have an account yet, which workspace_members
-- can't represent on its own since user_id is NOT NULL there. This adds the
-- missing half: a real invitation with its own lifecycle, independent of
-- whether the invited person has signed up yet.

DO $$
BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  -- 'owner' is deliberately excluded - ownership is assigned once at
  -- workspace creation (see auth.repository.js#createUserWithWorkspace) and
  -- isn't something this feature transfers.
  role member_role NOT NULL DEFAULT 'editor' CHECK (role <> 'owner'),
  token TEXT NOT NULL UNIQUE,
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one *pending* invite per email per workspace - re-inviting refreshes
-- this same row (new token, new expiry) rather than creating a duplicate.
-- Deliberately not filtering by expires_at here: a partial index predicate
-- can't reference now() (it's not immutable), so an expired-but-still
-- "pending" row is still treated as the row to refresh, not a new insert -
-- see team.repository.js#upsertInvitation.
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_invitations_pending_email
ON workspace_invitations(workspace_id, email)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id
ON workspace_invitations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email
ON workspace_invitations(email);