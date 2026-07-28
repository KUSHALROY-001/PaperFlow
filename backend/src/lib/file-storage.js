import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadsRoot = path.resolve(__dirname, "../../uploads");

export async function ensureUploadDir(workspaceId, mockTestId) {
  const targetDir = path.join(uploadsRoot, workspaceId, mockTestId);
  await mkdir(targetDir, { recursive: true });
  return targetDir;
}

export function buildStorageKey(workspaceId, mockTestId, filename) {
  return path.posix.join("uploads", workspaceId, mockTestId, filename);
}

// Deletes a single uploaded file from disk. Safe to call even if the file is
// already gone. Used both for cleanup after failed uploads and for cascade
// deletes (deleting a mock test / cluster does not automatically remove the
// files that belonged to it).
export async function deleteFileByPath(absolutePath) {
  if (!absolutePath) return;
  try {
    await rm(absolutePath, { force: true });
  } catch (error) {
    console.error(
      `[file-storage] failed to delete ${absolutePath}:`,
      error.message,
    );
  }
}

// Deletes every file under uploads/<workspaceId>/<mockTestId>/, used when a
// mock test (or its parent cluster) is deleted.
export async function deleteMockTestUploadDir(workspaceId, mockTestId) {
  const targetDir = path.join(uploadsRoot, workspaceId, mockTestId);
  try {
    await rm(targetDir, { recursive: true, force: true });
  } catch (error) {
    console.error(
      `[file-storage] failed to delete dir ${targetDir}:`,
      error.message,
    );
  }
}
