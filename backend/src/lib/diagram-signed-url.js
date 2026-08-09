import crypto from "node:crypto";

// A plain <img src="..."> tag cannot carry an Authorization header, but
// every existing endpoint in this codebase authenticates via header, not
// query string. Rather than adding blob-fetch-and-createObjectURL
// machinery to four different frontend components, this is one narrow
// exception: a short-lived, purpose-specific signed token accepted as a
// query parameter, scoped ONLY to image-serving routes - never the main
// JWT, which would leak into server logs and browser history with full
// account privileges. This token can only ever fetch one specific
// question's diagram, for a short window.

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Matches lib/jwt.js's exact secret-resolution behavior on purpose - a
// missing JWT_SECRET in dev shouldn't crash the whole app on startup any
// more than the main auth token signing does, it should warn and fall
// back the same way.
const secret = process.env.JWT_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is required in production");
}
const devFallbackSecret = "paperflow-dev-secret-change-me";

/**
 * @param {string} questionId
 * @param {string} workspaceId - included in the signed payload so a
 *   token can't be replayed against a different workspace's question
 *   even if question IDs were ever guessable/enumerable.
 * @returns {string} an access_token value, safe to embed directly in an
 *   <img src="...?access_token=..."> query string.
 */
export function generateDiagramAccessToken(questionId, workspaceId) {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${questionId}.${workspaceId}.${expiresAt}`;
  const signature = sign(payload);
  // base64url so this is safe to drop straight into a query string with
  // no additional escaping.
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

/**
 * @param {string} token - the raw access_token query param value.
 * @param {string} questionId - the questionId the request is FOR (from
 *   the URL path) - checked against the token's own embedded questionId
 *   so a valid token for question A can never be reused to fetch
 *   question B's image by just editing the URL path.
 * @param {string} [workspaceId] - OPTIONAL. When supplied (the shared/
 *   public route, which independently resolves a workspaceId from its
 *   own share token), cross-checked against the token's embedded
 *   workspaceId as defense in depth. When omitted (the authenticated
 *   route - this endpoint deliberately sits OUTSIDE requireAuth, since a
 *   plain <img src> request carries no Authorization header for
 *   requireAuth to populate req.workspaceId from in the first place),
 *   the token's own embedded workspaceId is trusted on its own: the HMAC
 *   signature already proves it was legitimately issued by this server
 *   and hasn't been tampered with, so there is nothing independent left
 *   to cross-check it against.
 * @returns {{ valid: true, workspaceId: string } | { valid: false, reason: "malformed" | "expired" | "tampered" | "question_mismatch" }}
 */
export function verifyDiagramAccessToken(token, questionId, workspaceId) {
  let decoded;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return { valid: false, reason: "malformed" };
  }

  const parts = decoded.split(".");
  if (parts.length !== 4) {
    return { valid: false, reason: "malformed" };
  }
  const [tokenQuestionId, tokenWorkspaceId, expiresAtRaw, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) {
    return { valid: false, reason: "malformed" };
  }

  const payload = `${tokenQuestionId}.${tokenWorkspaceId}.${expiresAtRaw}`;
  const expectedSignature = sign(payload);

  // Compare actual Buffer BYTE lengths before calling timingSafeEqual,
  // not JS string .length (UTF-16 code units) - a corrupted/tampered
  // base64 decode can produce a string containing multi-byte UTF-8
  // characters, where .length and the buffer's actual byte length
  // diverge, crashing timingSafeEqual on exactly the tampered-token case
  // this guard exists to handle safely.
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");

  const signaturesMatch =
    signatureBuffer.length === expectedSignatureBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer);

  if (!signaturesMatch) {
    return { valid: false, reason: "tampered" };
  }

  if (Date.now() > expiresAt) {
    return { valid: false, reason: "expired" };
  }

  if (
    tokenQuestionId !== questionId ||
    (workspaceId != null && tokenWorkspaceId !== workspaceId)
  ) {
    return { valid: false, reason: "question_mismatch" };
  }

  return { valid: true, workspaceId: tokenWorkspaceId };
}

function sign(payload) {
  return crypto
    .createHmac("sha256", secret || devFallbackSecret)
    .update(payload)
    .digest("base64url");
}
