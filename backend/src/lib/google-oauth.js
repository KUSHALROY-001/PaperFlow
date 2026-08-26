import { OAuth2Client } from "google-auth-library";

const clientId = process.env.GOOGLE_CLIENT_ID;

if (!clientId) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("GOOGLE_CLIENT_ID is required in production");
  }
  console.warn(
    "[google-oauth] GOOGLE_CLIENT_ID is not set. Google Sign-In requests will fail until it's configured (same OAuth Client ID the frontend's VITE_GOOGLE_CLIENT_ID must also use - see AuthPage.jsx).",
  );
}

const client = new OAuth2Client(clientId);

// Verifies the ID token's signature against Google's own public keys and
// checks it was actually issued for THIS app's Client ID (the `audience`
// check) - without that second check, a valid Google ID token minted for
// a completely different application would also pass verification here,
// since the signature alone only proves "Google issued this token to
// someone," not "Google issued this token to us."
//
// Throws on anything invalid (expired, wrong audience, bad signature,
// malformed) rather than returning null/false - callers (auth.service.js)
// are expected to let that propagate into a 401, not treat a verification
// failure as just another "no user found" case.
export async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });
  return ticket.getPayload();
}
