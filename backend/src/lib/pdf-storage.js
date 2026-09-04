import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { httpError } from "./http-error.js";

// storageKey is built from user-controlled input (buildPdfStorageKey embeds
// the extension parsed out of the client-supplied originalFilename) and is
// logged in several places below when an upload/verify/delete call fails.
// Logging it raw would let an attacker inject newlines/control characters
// into the filename and forge extra log lines or corrupt log parsing (CWE
// log injection - jssecurity:S5145). Strip anything that isn't a printable,
// single-line character before it ever reaches console.* so the log stays
// a single well-formed line no matter what the client sends.
function sanitizeForLog(value) {
  return String(value ?? "").replace(/[\r\n\t\p{Cc}]/gu, "\uFFFD");
}

// B2 speaks the S3 API, so the plain AWS SDK works against it unmodified
// once pointed at B2's own endpoint - no B2-specific SDK needed. This is
// the Node-side twin of worker/storage.py's _get_b2_client(); PDFs are
// written here (multer's memoryStorage buffer, see mock-tests.routes.js)
// and read there (the worker downloads by storage_key to a temp file to
// process - see worker/worker.py#download_job_pdf).
let client = null;

export function checkPdfStorageConfig() {
  const missing = [];
  if (!process.env.B2_ENDPOINT_URL) missing.push("B2_ENDPOINT_URL");
  if (!process.env.B2_BUCKET) missing.push("B2_BUCKET");
  if (!process.env.B2_KEY_ID) missing.push("B2_KEY_ID");
  if (!process.env.B2_APPLICATION_KEY) missing.push("B2_APPLICATION_KEY");

  return {
    configured: missing.length === 0,
    missing,
  };
}

export function isPdfStorageConfigured() {
  return checkPdfStorageConfig().configured;
}

export function validatePdfStorageConfig() {
  const { configured, missing } = checkPdfStorageConfig();
  if (!configured) {
    throw httpError(
      503,
      `Cloud PDF storage (Backblaze B2) is not configured. Missing required environment variables: ${missing.join(", ")}`,
      { missingVariables: missing },
    );
  }
}

function getClient() {
  validatePdfStorageConfig();
  if (!client) {
    const { B2_ENDPOINT_URL, B2_REGION, B2_KEY_ID, B2_APPLICATION_KEY } =
      process.env;
    client = new S3Client({
      endpoint: B2_ENDPOINT_URL,
      region: B2_REGION || "us-east-005", // B2 ignores this for routing, but the SDK requires a value
      credentials: {
        accessKeyId: B2_KEY_ID,
        secretAccessKey: B2_APPLICATION_KEY,
      },
      // Essential for Backblaze B2 and custom S3 endpoints with uppercase bucket names:
      // prevents virtual-hosted subdomains (e.g. PaperFlow-PDF.s3...) which cause DNS/SSL failures
      forcePathStyle: true,
      // Recent SDK versions default to auto-attaching a request checksum
      // (x-amz-checksum-crc32) to every PutObjectCommand. That's fine for
      // uploadPdf() below, which sends real bytes the SDK can hash - but
      // fatal for getPresignedUploadUrl(): presigning has no body to hash,
      // so the SDK bakes in the checksum of an EMPTY payload
      // ("AAAAAA==") as part of the signed URL, and the browser's later
      // PUT of the real file then mismatches it. "WHEN_REQUIRED" restores
      // the pre-default-checksum behavior (only attach one when the
      // command explicitly asks via ChecksumAlgorithm, which we don't),
      // fixing presigned uploads without touching uploadPdf()'s own
      // direct, already-correct checksum behavior.
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }
  return client;
}

function getBucket() {
  validatePdfStorageConfig();
  return process.env.B2_BUCKET;
}

function formatB2Error(error, operation = "upload") {
  const code = error?.name || error?.Code || error?.code || "";
  const rawMessage = error?.message || String(error);

  if (code === "NoSuchBucket" || rawMessage.includes("NoSuchBucket")) {
    return `Backblaze B2 bucket "${process.env.B2_BUCKET}" does not exist or cannot be accessed.`;
  }
  if (
    code === "AccessDenied" ||
    code === "InvalidAccessKeyId" ||
    code === "SignatureDoesNotMatch" ||
    rawMessage.includes("Access Denied") ||
    rawMessage.includes("InvalidAccessKeyId")
  ) {
    return "Authentication to Backblaze B2 failed. Please verify your B2_KEY_ID and B2_APPLICATION_KEY.";
  }
  if (
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "TimeoutError" ||
    rawMessage.includes("ENOTFOUND") ||
    rawMessage.includes("fetch failed")
  ) {
    return `Could not connect to Backblaze B2 endpoint (${process.env.B2_ENDPOINT_URL || "unknown URL"}). Please check network connectivity and endpoint URL.`;
  }

  return `Cloud PDF ${operation} failed: ${rawMessage}`;
}

// Same key shape the old local-disk buildStorageKey produced
// (workspaceId/mockTestId/uuid.ext), just as a B2 object key instead of a
// filesystem path - kept deliberately similar so it's still legible in
// the B2 console/logs which workspace and mock test a given object
// belongs to.
export function buildPdfStorageKey(workspaceId, mockTestId, originalFilename) {
  const ext = path.extname(originalFilename || "") || ".pdf";
  return `uploads/${workspaceId}/${mockTestId}/${randomUUID()}${ext}`;
}

export async function uploadPdf(buffer, storageKey, mimeType) {
  validatePdfStorageConfig();
  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType || "application/pdf",
        ContentLength: buffer.length,
      }),
    );
    return storageKey;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    const friendlyMessage = formatB2Error(error, "upload");
    console.error(
      `Failed to upload PDF to B2 (${sanitizeForLog(storageKey)}):`,
      error,
    );
    throw httpError(502, friendlyMessage, { originalError: error.message });
  }
}

// Lets the browser PUT the PDF bytes straight to B2 - the request never
// touches this Node process at all, so the upload's speed is capped only
// by the user's link to B2 and B2's own ingest, not by this server's own
// (often much smaller) outbound bandwidth or its distance from B2. See
// mock-tests.service.js#createUploadUrl / #completeUpload for the two
// endpoints that use this instead of the old buffer-through-Node path in
// #uploadDocument.
export async function getPresignedUploadUrl(
  storageKey,
  mimeType,
  expiresInSeconds = 300,
) {
  validatePdfStorageConfig();
  try {
    return await getSignedUrl(
      getClient(),
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: storageKey,
        ContentType: mimeType || "application/pdf",
      }),
      { expiresIn: expiresInSeconds },
    );
  } catch (error) {
    const friendlyMessage = formatB2Error(error, "presign");
    console.error(
      `Failed to presign PDF upload URL (${sanitizeForLog(storageKey)}):`,
      error,
    );
    throw httpError(502, friendlyMessage, { originalError: error.message });
  }
}

// Called once the browser reports the direct PUT finished, so a client
// that lies about (or never actually completes) the upload can't get a
// DB row / processing job created for an object that isn't really in B2.
// Also the source of truth for the real ContentLength/ContentType, rather
// than trusting whatever the browser claims in the completion request.
//
// Retries on transient connection-level failures only (DNS/connect
// timeouts, connection resets - never on a real B2 response like 403/404,
// which retrying can't fix). This call runs AFTER the browser's own
// multi-minute direct-to-B2 upload already succeeded (see
// mock-tests.service.js#completeUpload, which calls this before creating
// any DB record) - a single bad network moment on this one read-only
// check shouldn't throw away an otherwise-successful upload and force
// the user to re-upload the whole file from scratch.
const HEAD_PDF_MAX_ATTEMPTS = 3;
const HEAD_PDF_RETRY_DELAY_MS = 2000;

function isTransientConnectionError(error) {
  const code = error?.code || error?.cause?.code || "";
  const name = error?.name || "";
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "EAI_AGAIN" ||
    name === "TimeoutError" ||
    name === "AggregateError"
  );
}

export async function headPdf(storageKey) {
  validatePdfStorageConfig();

  for (let attempt = 1; attempt <= HEAD_PDF_MAX_ATTEMPTS; attempt++) {
    try {
      const result = await getClient().send(
        new HeadObjectCommand({ Bucket: getBucket(), Key: storageKey }),
      );
      return {
        exists: true,
        sizeBytes: result.ContentLength,
        mimeType: result.ContentType,
      };
    } catch (error) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return { exists: false };
      }

      const transient = isTransientConnectionError(error);
      if (!transient || attempt === HEAD_PDF_MAX_ATTEMPTS) {
        const friendlyMessage = formatB2Error(error, "verify");
        console.error(
          `Failed to verify PDF upload (${sanitizeForLog(storageKey)}) after ${attempt} attempt(s):`,
          error,
        );
        throw httpError(502, friendlyMessage, { originalError: error.message });
      }

      console.warn(
        `Transient error verifying PDF upload (${sanitizeForLog(storageKey)}) on attempt ${attempt}/${HEAD_PDF_MAX_ATTEMPTS}, retrying in ${HEAD_PDF_RETRY_DELAY_MS}ms: ${error.message}`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, HEAD_PDF_RETRY_DELAY_MS),
      );
    }
  }
}

export async function deletePdf(storageKey) {
  if (!storageKey) return;
  if (!isPdfStorageConfigured()) {
    console.warn(`Skipping delete for PDF ${storageKey}: B2 is not configured`);
    return;
  }
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: getBucket(), Key: storageKey }),
    );
  } catch (error) {
    // Best-effort, matching the old deleteFileByPath's own stance on a
    // missing/already-gone file - a mock test/upload delete shouldn't
    // fail just because its B2 object was already cleaned up some other
    // way.
    console.error(`Failed to delete PDF ${storageKey} from B2:`, error);
  }
}
