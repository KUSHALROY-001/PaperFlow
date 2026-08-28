import crypto from "node:crypto";
import { pool } from "../db/pool.js";
import { httpError } from "../lib/http-error.js";
import { resolveAvatarUrl } from "../lib/cloudinary-storage.js";
import { requiredEnum, requiredString } from "../lib/validators.js";
import * as authRepo from "../repositories/auth.repository.js";
import * as teamRepo from "../repositories/team.repository.js";

function shapeMember(member) {
  if (!member) return member;
  const { avatarUrl, avatarPublicId, avatarUpdatedAt, ...rest } = member;
  return {
    ...rest,
    avatarUrl: resolveAvatarUrl({
      avatarPublicId,
      avatarUpdatedAt,
      avatarUrl,
    }),
  };
}

function shapeInvitation(invitation) {
  if (!invitation) return invitation;
  const {
    invitedByAvatarUrl,
    invitedByAvatarPublicId,
    invitedByAvatarUpdatedAt,
    ...rest
  } = invitation;
  return {
    ...rest,
    invitedByAvatarUrl: resolveAvatarUrl({
      avatarPublicId: invitedByAvatarPublicId,
      avatarUpdatedAt: invitedByAvatarUpdatedAt,
      avatarUrl: invitedByAvatarUrl,
    }),
  };
}

// 'owner' deliberately excluded - see the CHECK constraint in
// 005_team_invitations.sql for why (ownership isn't transferred through
// this feature).
const ASSIGNABLE_ROLES = ["admin", "editor", "viewer"];

const INVITATION_EXPIRY_DAYS = 7;

function assertNotOwner(member) {
  if (member.role === "owner") {
    throw httpError(403, "The workspace owner's role can't be changed here");
  }
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
export async function listMembers(workspaceId) {
  const members = await teamRepo.listMembers(workspaceId);
  return members.map(shapeMember);
}

export async function updateMemberRole(memberId, workspaceId, body) {
  const role = requiredEnum(body.role, ASSIGNABLE_ROLES, "role");

  const member = await teamRepo.findMemberById(memberId, workspaceId);
  if (!member) {
    throw httpError(404, "Member not found");
  }

  assertNotOwner(member);

  await teamRepo.updateMemberRole(memberId, workspaceId, role);

  return shapeMember(await teamRepo.findMemberById(memberId, workspaceId));
}

export async function removeMember(memberId, workspaceId) {
  const member = await teamRepo.findMemberById(memberId, workspaceId);
  if (!member) {
    throw httpError(404, "Member not found");
  }

  assertNotOwner(member);

  await teamRepo.deleteMember(memberId, workspaceId);
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------
export async function listInvitations(workspaceId) {
  const invitations = await teamRepo.listPendingInvitations(workspaceId);
  return invitations.map(shapeInvitation);
}

// Deliberately takes an email, not a workspaceId - this is "invites sent to
// me" across every workspace, the counterpart to listInvitations above
// which is "invites I've sent from this one workspace."
export async function listMyInvitations(email) {
  const invitations = await teamRepo.listInvitationsForEmail(email);
  return invitations.map(shapeInvitation);
}

export async function createInvitation(workspaceId, invitedBy, body) {
  const email = requiredString(body.email, "email").toLowerCase();
  const role = requiredEnum(body.role || "editor", ASSIGNABLE_ROLES, "role");

  const existingUser = await authRepo.findActiveUserByEmail(email);
  if (existingUser) {
    const existingMembership = await teamRepo.findMembershipByUserAndWorkspace(
      existingUser.id,
      workspaceId,
    );
    if (existingMembership) {
      throw httpError(409, "This person is already a member of this workspace");
    }
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  // The invitation is created either way, whether or not existingUser exists
  // yet - accepting it (see acceptInvitation below) is what actually
  // requires an account, not sending it. This is what lets you invite
  // someone who hasn't signed up yet.
  const invitation = await teamRepo.upsertInvitation({
    workspaceId,
    email,
    role,
    token,
    expiresAt,
    invitedBy,
  });

  // NOTE: no email is actually sent - there's no email provider wired into
  // this backend yet (see package.json). The token is returned here so a
  // caller (or a future email-sending step) can build the accept link
  // (e.g. `${FRONTEND_URL}/accept-invite?token=${token}`) themselves.
  return invitation;
}

export async function revokeInvitation(invitationId, workspaceId) {
  const revoked = await teamRepo.revokeInvitation(invitationId, workspaceId);

  if (!revoked) {
    throw httpError(404, "Invitation not found or no longer pending");
  }
}

// Accepting requires the caller to already be authenticated (with any
// account) - there's no separate "invite-only signup" path. If the invited
// person doesn't have an account yet, the frontend should send them through
// normal signup/login first (with the invited email) and then call this.
//
// The lookup and the membership insert both run inside one transaction so a
// double-accept (e.g. the link opened twice) can't create two membership
// rows or double-consume the invitation - same reasoning as
// extraction-templates.service.js#applyTemplate.
export async function acceptInvitation(token, currentUser) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const invitation = await teamRepo.findPendingInvitationByToken(
      token,
      client,
    );

    if (!invitation) {
      throw httpError(404, "Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw httpError(409, "This invitation has already been used or revoked");
    }

    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      throw httpError(409, "This invitation has expired - ask for a new one");
    }

    if (invitation.email.toLowerCase() !== currentUser.email.toLowerCase()) {
      throw httpError(
        403,
        "This invitation was sent to a different email address",
      );
    }

    await teamRepo.insertMemberFromInvitation(client, {
      workspaceId: invitation.workspaceId,
      userId: currentUser.id,
      role: invitation.role,
    });

    await teamRepo.markInvitationAccepted(client, invitation.id);

    await client.query("COMMIT");

    return { workspaceId: invitation.workspaceId, role: invitation.role };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
