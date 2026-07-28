import { httpError } from "../lib/http-error.js";
import { deleteMockTestUploadDir } from "../lib/file-storage.js";
import { optionalString, requiredString } from "../lib/validators.js";
import * as clustersRepo from "../repositories/clusters.repository.js";

export async function listClusters(workspaceId) {
  return clustersRepo.listClusters(workspaceId);
}

export async function createCluster(workspaceId, userId, body) {
  const name = requiredString(body.name, "name");
  const description = optionalString(body.description);

  return clustersRepo.createCluster({
    workspaceId,
    createdBy: userId,
    name,
    description,
  });
}

export async function getCluster(clusterId, workspaceId) {
  const cluster = await clustersRepo.findClusterById(clusterId, workspaceId);

  if (!cluster) {
    throw httpError(404, "Cluster not found");
  }

  return cluster;
}

export async function updateCluster(clusterId, workspaceId, body) {
  const name =
    body.name === undefined ? undefined : requiredString(body.name, "name");
  const descriptionProvided = body.description !== undefined;
  const description = optionalString(body.description);

  const cluster = await clustersRepo.updateCluster(clusterId, workspaceId, {
    name,
    descriptionProvided,
    description,
  });

  if (!cluster) {
    throw httpError(404, "Cluster not found");
  }

  return cluster;
}

// Deleting a cluster cascades to mock_tests / uploaded_files / processing_jobs
// / questions at the DB level, but Postgres has no idea those mock tests also
// own directories of PDFs on local disk. We have to clean those up ourselves,
// before the DB rows (and therefore the workspaceId/mockTestId we need to
// find the directory) disappear.
export async function deleteCluster(clusterId, workspaceId) {
  const mockTestIds = await clustersRepo.listMockTestIdsForCluster(
    clusterId,
    workspaceId,
  );

  const deleted = await clustersRepo.deleteCluster(clusterId, workspaceId);

  if (!deleted) {
    throw httpError(404, "Cluster not found");
  }

  await Promise.all(
    mockTestIds.map((mockTestId) =>
      deleteMockTestUploadDir(workspaceId, mockTestId),
    ),
  );
}

export async function listMockTestsForCluster(clusterId, workspaceId) {
  return clustersRepo.listMockTestsForCluster(clusterId, workspaceId);
}

export async function createMockTestInCluster(
  clusterId,
  workspaceId,
  userId,
  body,
) {
  const name = requiredString(body.name, "name");
  const description = optionalString(body.description);
  const examYear = body.examYear ?? null;
  const durationMinutes = Number(body.durationMinutes || 120);
  const marksPerCorrect = Number(body.marksPerCorrect || 1);
  const negativeMarksPerWrong = Number(body.negativeMarksPerWrong ?? 0.25);

  const cluster = await clustersRepo.findClusterById(clusterId, workspaceId);

  if (!cluster) {
    throw httpError(404, "Cluster not found");
  }

  return clustersRepo.createMockTestInCluster({
    workspaceId,
    clusterId,
    createdBy: userId,
    name,
    description,
    examYear,
    durationMinutes,
    marksPerCorrect,
    negativeMarksPerWrong,
  });
}
