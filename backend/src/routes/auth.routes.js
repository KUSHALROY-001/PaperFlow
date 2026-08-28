import { Router } from "express";
import multer from "multer";
import * as authController from "../controllers/auth.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { httpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/require-auth.js";

export const authRouter = Router();

// Memory storage, not disk - the service re-encodes every upload through
// sharp() before it ever touches Cloudinary (see auth.service.js#uploadAvatar),
// same reasoning as questions.routes.js's diagram upload middleware, which
// this mirrors.
const uploadAvatarMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    const isImage = ["image/png", "image/jpeg", "image/webp"].includes(
      file.mimetype,
    );
    if (!isImage) {
      callback(httpError(400, "Only PNG, JPEG, or WEBP images are supported"));
      return;
    }
    callback(null, true);
  },
});

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
authRouter.post(
  "/avatar",
  requireAuth,
  uploadAvatarMiddleware.single("avatar"),
  asyncHandler(authController.uploadAvatar),
);
authRouter.delete(
  "/avatar",
  requireAuth,
  asyncHandler(authController.deleteAvatar),
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
