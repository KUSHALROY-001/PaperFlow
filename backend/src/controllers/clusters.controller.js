import * as clustersService from "../services/clusters.service.js";

export async function list(req, res) {
  const clusters = await clustersService.listClusters(req.workspaceId);
  res.json({ clusters });
}

export async function create(req, res) {
  const cluster = await clustersService.createCluster(
    req.workspaceId,
    req.user.id,
    req.body,
  );
  res.status(201).json({ cluster });
}

export async function getOne(req, res) {
  const cluster = await clustersService.getCluster(
    req.params.clusterId,
    req.workspaceId,
  );
  res.json({ cluster });
}

export async function update(req, res) {
  const cluster = await clustersService.updateCluster(
    req.params.clusterId,
    req.workspaceId,
    req.body,
  );
  res.json({ cluster });
}

export async function remove(req, res) {
  await clustersService.deleteCluster(req.params.clusterId, req.workspaceId);
  res.status(204).send();
}

export async function listMockTests(req, res) {
  const mockTests = await clustersService.listMockTestsForCluster(
    req.params.clusterId,
    req.workspaceId,
  );
  res.json({ mockTests });
}

export async function createMockTest(req, res) {
  const mockTest = await clustersService.createMockTestInCluster(
    req.params.clusterId,
    req.workspaceId,
    req.user.id,
    req.body,
  );
  res.status(201).json({ mockTest });
}
