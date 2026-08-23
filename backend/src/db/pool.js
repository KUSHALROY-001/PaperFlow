import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// Managed providers like Aiven require TLS and present a cert signed by
// their own CA. node-postgres does not enable SSL automatically just
// because DATABASE_URL is present, so without this the client attempts a
// plain connection and the server just times out waiting for a TLS
// handshake that never comes (looks like a network issue, isn't one).
//
// The CA can come from either:
//  - DB_CA_CERT: the PEM content directly, for platforms (Render, Railway,
//    etc.) where shipping an extra file alongside the deploy is awkward
//  - DB_CA_CERT_PATH: a file path, resolved relative to this file (not
//    process.cwd(), which varies depending on how the process is started)
//    - defaults to backend/certs/ca.pem
// If neither is set, SSL is left off, so this stays a no-op for local
// Postgres without SSL configured.
function resolveSsl() {
  const url = process.env.DATABASE_URL || "";
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");

  // Local PostgreSQL servers typically do not have SSL enabled.
  if (isLocal) {
    return undefined;
  }

  const inlineCert = process.env.DB_CA_CERT;
  if (inlineCert) {
    // Windows editors/terminals frequently leave \r\n line endings in a
    // pasted multiline .env value. OpenSSL's PEM parser is strict about
    // this - a stray \r on each line corrupts the base64 body enough to
    // produce a confusing "self signed certificate in certificate chain"
    // error, even though the cert content itself is correct. Normalizing
    // here means it doesn't matter which OS/editor produced the .env file.
    const normalizedCert = inlineCert.replace(/\r\n/g, "\n");
    return { rejectUnauthorized: true, ca: normalizedCert };
  }

  const certPath = path.resolve(
    __dirname,
    "../../",
    process.env.DB_CA_CERT_PATH || "certs/ca.pem",
  );

  if (!fs.existsSync(certPath)) {
    if (process.env.DB_CA_CERT_PATH) {
      // Explicitly configured but missing - fail loudly rather than
      // silently falling back to an unencrypted/unverified connection.
      throw new Error(
        `DB_CA_CERT_PATH is set to "${certPath}" but that file does not exist`,
      );
    }
    return undefined;
  }

  return { rejectUnauthorized: true, ca: fs.readFileSync(certPath, "utf8") };
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: resolveSsl(),

  // Aiven plans cap total concurrent connections (e.g. 20 on Hobbyist,
  // shared across this pool AND the Python worker process) - keep this
  // comfortably under that limit, and raise PG_POOL_MAX if your plan
  // allows more. 1 is only appropriate for one-off scripts like db:check.
  max: process.env.PG_POOL_MAX ? Number(process.env.PG_POOL_MAX) : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

export async function query(text, params) {
  return pool.query(text, params);
}
