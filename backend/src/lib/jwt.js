import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;

if (!secret) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  console.warn(
    "[jwt] JWT_SECRET is not set. Using an insecure development-only secret.",
  );
}

const devFallbackSecret = "paperflow-dev-secret-change-me";

export function signAccessToken(payload) {
  return jwt.sign(payload, secret || devFallbackSecret, {
    expiresIn: "7d",
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, secret || devFallbackSecret);
}
