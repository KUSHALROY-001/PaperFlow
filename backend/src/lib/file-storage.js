import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadsRoot = path.resolve(__dirname, '../../uploads');

export async function ensureUploadDir(workspaceId, mockTestId) {
  const targetDir = path.join(uploadsRoot, workspaceId, mockTestId);
  await mkdir(targetDir, { recursive: true });
  return targetDir;
}

export function buildStorageKey(workspaceId, mockTestId, filename) {
  return path.posix.join('uploads', workspaceId, mockTestId, filename);
}
