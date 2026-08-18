import * as catalogService from "../services/catalog.service.js";

export async function getGlobalCatalog(req, res) {
  const mockTests = await catalogService.getGlobalCatalog({
    search: req.query.search,
    examYear: req.query.examYear ? Number(req.query.examYear) : undefined,
  });
  res.json({ mockTests });
}

export async function getGlobalCatalogExamYears(req, res) {
  const examYears = await catalogService.getGlobalCatalogExamYears();
  res.json({ examYears });
}

export async function getGlobalCatalogMockTestDetail(req, res) {
  const mockTest = await catalogService.getCatalogMockTestDetail(
    req.params.mockTestId,
    null,
  );
  res.json({ mockTest });
}

export async function getCatalog(req, res) {
  const result = await catalogService.getCatalog(req.params.slug, {
    search: req.query.search,
    examYear: req.query.examYear ? Number(req.query.examYear) : undefined,
  });
  res.json(result);
}

export async function getCatalogExamYears(req, res) {
  const examYears = await catalogService.getCatalogExamYears(req.params.slug);
  res.json({ examYears });
}

export async function getCatalogMockTestDetail(req, res) {
  const mockTest = await catalogService.getCatalogMockTestDetail(
    req.params.mockTestId,
    req.params.slug,
  );
  res.json({ mockTest });
}

export async function startCatalogAttempt(req, res) {
  const share = await catalogService.startCatalogAttempt(
    req.params.slug,
    req.params.mockTestId,
  );
  res.status(201).json({ share });
}
