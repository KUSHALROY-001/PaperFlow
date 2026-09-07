import rateLimit from "express-rate-limit";
import { httpError } from "../lib/http-error.js";

// Coarse, IP-based defense-in-depth on top of the per-account rules
// already enforced in auth.service.js (max OTP attempts, resend
// cooldown). In-memory store - fine for the current single-instance
// deployment; if this ever runs as multiple instances behind a load
// balancer, swap in a shared store (e.g. Redis) or each instance will
// track its own counters.
function authLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler(_req, _res, next) {
      next(httpError(429, message));
    },
  });
}

export const signupRateLimit = authLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many signup attempts from this network. Please try again later.",
});

export const verifyOtpRateLimit = authLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many verification attempts from this network. Please try again later.",
});

export const resendOtpRateLimit = authLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many code requests from this network. Please try again later.",
});
