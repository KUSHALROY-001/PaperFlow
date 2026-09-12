-- A recipient can decline an invitation without needing workspace membership.
-- Keep it distinct from 'revoked', which is an action taken by a workspace
-- administrator who originally sent the invitation.
ALTER TYPE invitation_status ADD VALUE IF NOT EXISTS 'declined';
