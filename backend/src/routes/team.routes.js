import { Router } from "express";
import * as teamController from "../controllers/team.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireRole } from "../middleware/require-role.js";

export const teamRouter = Router();

teamRouter.get("/members", asyncHandler(teamController.listMembers));
teamRouter.patch(
  "/members/:memberId",
  requireRole("admin"),
  asyncHandler(teamController.updateMemberRole),
);
teamRouter.delete(
  "/members/:memberId",
  requireRole("admin"),
  asyncHandler(teamController.removeMember),
);

teamRouter.get("/invitations", asyncHandler(teamController.listInvitations));
teamRouter.get(
  "/invitations/mine",
  asyncHandler(teamController.listMyInvitations),
);
teamRouter.post(
  "/invitations",
  requireRole("admin"),
  asyncHandler(teamController.createInvitation),
);
teamRouter.delete(
  "/invitations/:invitationId",
  requireRole("admin"),
  asyncHandler(teamController.revokeInvitation),
);

// No requireRole here - any authenticated user can accept an invitation
// addressed to their own email, regardless of what role (if any) they hold
// in the workspace they're currently attached to.
teamRouter.post(
  "/invitations/:token/accept",
  asyncHandler(teamController.acceptInvitation),
);
