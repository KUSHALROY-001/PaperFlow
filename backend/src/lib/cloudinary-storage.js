import { v2 as cloudinary } from "cloudinary";
import { httpError } from "./http-error.js";

function getCloudinaryCredentials() {
  const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();
  const cloudName = (
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUD_NAME ||
    ""
  ).trim();
  const apiKey = (
    process.env.CLOUDINARY_API_KEY ||
    process.env.API_KEY ||
    ""
  ).trim();
  const apiSecret = (
    process.env.CLOUDINARY_API_SECRET ||
    process.env.API_SECRET ||
    ""
  ).trim();

  return { cloudinaryUrl, cloudName, apiKey, apiSecret };
}

export function checkCloudinaryConfig() {
  const { cloudinaryUrl, cloudName, apiKey, apiSecret } =
    getCloudinaryCredentials();

  if (cloudinaryUrl) {
    return { configured: true, missing: [] };
  }

  const missing = [];
  if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!apiKey) missing.push("CLOUDINARY_API_KEY");
  if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");

  return {
    configured: missing.length === 0,
    missing: missing.length > 0 ? ["CLOUDINARY_URL or (" + missing.join(", ") + ")"] : [],
  };
}

export function isCloudinaryConfigured() {
  return checkCloudinaryConfig().configured;
}

export function validateCloudinaryConfig() {
  const { configured, missing } = checkCloudinaryConfig();
  if (!configured) {
    throw httpError(
      503,
      `Cloud image storage (Cloudinary) is not configured. Missing required environment variables: ${missing.join(", ")}`,
      { missingVariables: missing },
    );
  }
}

let isConfigured = false;
export function configureCloudinary() {
  const { cloudinaryUrl, cloudName, apiKey, apiSecret } =
    getCloudinaryCredentials();

  if (cloudinaryUrl) {
    cloudinary.config({ cloudinary_url: cloudinaryUrl });
    isConfigured = true;
  } else if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    isConfigured = true;
  }
}

// Initial configuration attempt at import time
configureCloudinary();

// Same convention as worker/asset_extractor.py#build_diagram_public_id -
// deliberately identical, since a manually-uploaded diagram and an
// extracted one live at the same predictable location keyed only by
// question id, letting either one overwrite the other in place without
// the DB row's storage_path ever needing to change.
export function buildDiagramPublicId(workspaceId, mockTestId, questionId) {
  return `paperflow/${workspaceId}/${mockTestId}/diagrams/${questionId}`;
}

function formatCloudinaryError(error, operation = "upload") {
  const message = error?.message || String(error);
  if (message.includes("Must supply api_key") || message.includes("Must supply cloud_name")) {
    return "Cloudinary credentials are incomplete or invalid. Please check your environment variables.";
  }
  if (message.includes("Invalid Signature") || message.includes("Unauthorized")) {
    return "Authentication to Cloudinary failed. Please verify your API Key and API Secret.";
  }
  if (message.includes("ENOTFOUND") || message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
    return "Could not connect to Cloudinary image servers. Please check your internet connection.";
  }
  return `Cloud image ${operation} failed: ${message}`;
}

export async function uploadDiagramBuffer(buffer, publicId) {
  validateCloudinaryConfig();
  configureCloudinary();

  const dataUri = `data:image/png;base64,${buffer.toString("base64")}`;
  try {
    await cloudinary.uploader.upload(dataUri, {
      public_id: publicId,
      overwrite: true,
      resource_type: "image",
      format: "png",
    });
    return publicId;
  } catch (error) {
    if (error.statusCode) throw error;
    const friendlyMessage = formatCloudinaryError(error, "upload");
    console.error(`Failed to upload diagram buffer to Cloudinary (${publicId}):`, error);
    throw httpError(502, friendlyMessage, { originalError: error.message });
  }
}

// The actual delivery URL isn't stored in the DB (question_assets.storage_path
// holds the public_id, not the URL) - it's rebuilt on every read instead,
// so a cloud_name change or a switch to signed delivery later doesn't
// need a backfill migration, just this one function.
export function diagramUrlForPublicId(publicId) {
  validateCloudinaryConfig();
  configureCloudinary();

  try {
    const url = cloudinary.url(publicId, {
      secure: true,
      resource_type: "image",
      format: "png",
    });
    return url;
  } catch (error) {
    throw httpError(500, `Could not generate image delivery URL: ${error.message}`);
  }
}

export async function fetchDiagramBuffer(publicId) {
  validateCloudinaryConfig();
  const imageUrl = diagramUrlForPublicId(publicId);

  let response;
  try {
    response = await fetch(imageUrl);
  } catch (error) {
    throw httpError(
      502,
      `Could not reach cloud image storage to fetch diagram (${error.message})`,
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw httpError(404, `Diagram image not found on Cloudinary (id: ${publicId})`);
    }
    throw httpError(
      502,
      `Failed to fetch diagram from Cloudinary (status ${response.status}): ${response.statusText}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function deleteDiagram(publicId) {
  if (!publicId) return;
  if (!isCloudinaryConfigured()) {
    console.warn(`Skipping delete for diagram ${publicId}: Cloudinary is not configured`);
    return;
  }
  configureCloudinary();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    // Best-effort, same stance as pdf-storage.js#deletePdf - a question
    // delete shouldn't fail just because its Cloudinary asset was already
    // gone some other way.
    console.error(`Failed to delete diagram ${publicId} from Cloudinary:`, error);
  }
}
