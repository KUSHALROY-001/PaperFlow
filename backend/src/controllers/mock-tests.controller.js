import * as mockTestsService from "../services/mock-tests.service.js";

export async function list(req, res) {
  const mockTests = await mockTestsService.listMockTests(req.workspaceId);
  res.json({ mockTests });
}

export async function getOne(req, res) {
  const mockTest = await mockTestsService.getMockTestOrFail(
    req.params.mockTestId,
    req.workspaceId,
  );
  res.json({ mockTest });
}

export async function update(req, res) {
  const mockTest = await mockTestsService.updateMockTest(
    req.params.mockTestId,
    req.workspaceId,
    req.body,
  );
  res.json({ mockTest });
}

export async function publish(req, res) {
  const mockTest = await mockTestsService.publishMockTest(
    req.params.mockTestId,
    req.workspaceId,
  );
  res.json({ mockTest });
}

export async function remove(req, res) {
  await mockTestsService.deleteMockTest(req.params.mockTestId, req.workspaceId);
  res.status(204).send();
}

export async function upload(req, res) {
  // req.mockTest is attached by the loadMockTest middleware, which runs
  // BEFORE multer saves the file to disk - see routes file for why.
  const result = await mockTestsService.uploadDocument({
    mockTest: req.mockTest,
    workspaceId: req.workspaceId,
    userId: req.user.id,
    file: req.file,
    // multer parses non-file multipart fields into req.body alongside req.file
    documentType: req.body.documentType,
  });
  res.status(201).json(result);
}

export async function reprocess(req, res) {
  const result = await mockTestsService.reprocessMockTest({
    mockTest: req.mockTest,
    workspaceId: req.workspaceId,
    userId: req.user.id,
  });
  res.status(201).json(result);
}

export async function listQuestions(req, res) {
  const questions = await mockTestsService.listQuestions(
    req.params.mockTestId,
    req.workspaceId,
  );
  res.json({ questions });
}

export async function play(req, res) {
  const result = await mockTestsService.getPlayableMockTest(
    req.params.mockTestId,
    req.workspaceId,
  );
  res.json(result);
}
