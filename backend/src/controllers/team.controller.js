import * as teamService from "../services/team.service.js";

export async function listMembers(req, res) {
  const members = await teamService.listMembers(req.workspaceId);
  res.json({ members });
}

export async function updateMemberRole(req, res) {
  const member = await teamService.updateMemberRole(
    req.params.memberId,
    req.workspaceId,
    req.body,
  );
  res.json({ member });
}

export async function removeMember(req, res) {
  await teamService.removeMember(req.params.memberId, req.workspaceId);
  res.status(204).send();
}

export async function listInvitations(req, res) {
  const invitations = await teamService.listInvitations(req.workspaceId);
  res.json({ invitations });
}

// Uses req.user.email, not req.workspaceId - see team.service.js#listMyInvitations.
export async function listMyInvitations(req, res) {
  const invitations = await teamService.listMyInvitations(req.user.email);
  res.json({ invitations });
}

export async function createInvitation(req, res) {
  const invitation = await teamService.createInvitation(
    req.workspaceId,
    req.user.id,
    req.body,
  );
  res.status(201).json({ invitation });
}

export async function revokeInvitation(req, res) {
  await teamService.revokeInvitation(req.params.invitationId, req.workspaceId);
  res.status(204).send();
}

// Deliberately not scoped by req.workspaceId - the target workspace comes
// from the invitation token itself, since the accepting user may not be a
// member of that workspace yet (that's the whole point of accepting).
export async function acceptInvitation(req, res) {
  const result = await teamService.acceptInvitation(req.params.token, req.user);
  res.json(result);
}
