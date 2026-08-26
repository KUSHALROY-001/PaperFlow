import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { httpError } from "./http-error.js";

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
    console.error(`Failed to upload PDF to B2 (${storageKey}):`, error);
    throw httpError(502, friendlyMessage, { originalError: error.message });
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
