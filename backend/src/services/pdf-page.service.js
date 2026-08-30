import { httpError } from "../lib/http-error.js";
import { renderPdfPage } from "../lib/pdf-page-render-client.js";
import * as mockTestsRepo from "../repositories/mock-tests.repository.js";

// The "fetch any page from the source PDF" feature (Option A from the
// implementation discussion) - for a question where extraction found no
// diagram, this lets a reviewer pull the actual PDF page image straight
// from B2 and hand it to the SAME DiagramCropModal.jsx that already
// handles manual uploads, rather than requiring them to screenshot the
// PDF themselves on their own device.
//
// pageNumber defaults to the question's OWN question_slots.source_page
// when the caller doesn't specify one (see questions.controller.js) -
// every question already knows which page it came from, independent of
// whether a diagram was ever detected on it (migrations/001_initial_schema.sql).
// A caller can still request a DIFFERENT page explicitly - useful when a
// diagram visually spilled onto the page after the question's own text.
export async function fetchPdfPage(mockTestId, workspaceId, pageNumber) {
  const mockTest = await mockTestsRepo.findMockTestById(
    mockTestId,
    workspaceId,
  );
  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }

  const page = Number(pageNumber);
  if (!Number.isInteger(page) || page < 1) {
    throw httpError(400, "page must be a positive integer");
  }

  const { buffer, totalPages } = await renderPdfPage(
    mockTest.storage_key,
    page,
  );

  return { buffer, totalPages };
}
