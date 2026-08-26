import { httpError } from "../lib/http-error.js";
import { deletePdf } from "../lib/pdf-storage.js";
import { deleteDiagram } from "../lib/cloudinary-storage.js";
import { optionalString, requiredString } from "../lib/validators.js";
import * as clustersRepo from "../repositories/clusters.repository.js";
import * as mockTestsRepo from "../repositories/mock-tests.repository.js";
import * as questionAssetsRepo from "../repositories/question-assets.repository.js";

export async function listClusters(workspaceId) {
  return clustersRepo.listClusters(workspaceId);
}

export async function createCluster(workspaceId, userId, body) {
  const name = requiredString(body.name, "name");
  const description = optionalString(body.description);

  try {
    return await clustersRepo.createCluster({
      workspaceId,
      createdBy: userId,
      name,
      description,
    });
  } catch (error) {
    // 23505 = unique_violation, from the (workspace_id, name) constraint
    // (001_initial_schema.sql) - surfaced as a normal 409 rather than a
    // raw Postgres error, same reasoning as auth.service.js's
    // duplicate-email handling on signup.
    if (error.code === "23505") {
      throw httpError(409, `A cluster named "${name}" already exists`);
    }
    throw error;
  }
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

  let cluster;
  try {
    cluster = await clustersRepo.updateCluster(clusterId, workspaceId, {
      name,
      descriptionProvided,
      description,
    });
  } catch (error) {
    if (error.code === "23505") {
      throw httpError(409, `A cluster named "${name}" already exists`);
    }
    throw error;
  }

  if (!cluster) {
    throw httpError(404, "Cluster not found");
  }

  return cluster;
}

// Deleting a cluster cascades to mock_tests / uploaded_files / processing_jobs
// / questions at the DB level, but Postgres has no idea those mock tests also
// own PDFs on B2 and diagram images on Cloudinary. We have to clean those up
// ourselves, before the DB rows (and therefore the storage keys/public ids we
// need to find those remote objects) disappear.
export async function deleteCluster(clusterId, workspaceId) {
  const mockTestIds = await clustersRepo.listMockTestIdsForCluster(
    clusterId,
    workspaceId,
  );

  // Collected BEFORE the delete below, same reasoning as
  // mock-tests.service.js#deleteMockTest - once the cluster's cascade
  // delete runs, every uploaded_files/question_assets row for these mock
  // tests is gone, taking the storage keys/public ids with it.
  const [uploadedFilesByMockTest, diagramAssetsByMockTest] = await Promise.all([
    Promise.all(
      mockTestIds.map((mockTestId) =>
        mockTestsRepo.listUploadedFilesForMockTest(mockTestId, workspaceId),
      ),
    ),
    Promise.all(
      mockTestIds.map((mockTestId) =>
        questionAssetsRepo.findAssetsForMockTest(mockTestId),
      ),
    ),
  ]);

  const deleted = await clustersRepo.deleteCluster(clusterId, workspaceId);

  if (!deleted) {
    throw httpError(404, "Cluster not found");
  }

  await Promise.all([
    ...uploadedFilesByMockTest
      .flat()
      .map((file) => deletePdf(file.storage_key)),
    ...diagramAssetsByMockTest.flatMap((assetsByQuestionId) =>
      [...assetsByQuestionId.values()].map((asset) =>
        deleteDiagram(asset.storagePath),
      ),
    ),
  ]);
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

  try {
    return await clustersRepo.createMockTestInCluster({
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
  } catch (error) {
    // 23505 = unique_violation, from the (cluster_id, name) constraint -
    // same duplicate-name handling extraction-templates.service.js already
    // does for its own mock-test-creation path.
    if (error.code === "23505") {
      throw httpError(
        409,
        `A mock test named "${name}" already exists in this cluster`,
      );
    }
    throw error;
  }
}
