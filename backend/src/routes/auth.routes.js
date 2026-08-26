import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireAuth } from "../middleware/require-auth.js";

export const authRouter = Router();

authRouter.post("/signup", asyncHandler(authController.signup));
authRouter.post("/login", asyncHandler(authController.login));
authRouter.post("/google", asyncHandler(authController.googleAuth));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
authRouter.get(
  "/profile",
  requireAuth,
  asyncHandler(authController.getProfile),
);
authRouter.patch(
  "/profile",
  requireAuth,
  asyncHandler(authController.updateProfile),
);
authRouter.patch(
  "/password",
  requireAuth,
  asyncHandler(authController.changePassword),
);
authRouter.delete(
  "/account",
  requireAuth,
  asyncHandler(authController.deleteAccount),
);
