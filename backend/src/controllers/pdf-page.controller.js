import * as pdfPageService from "../services/pdf-page.service.js";

export async function getPage(req, res) {
  const { buffer, totalPages } = await pdfPageService.fetchPdfPage(
    req.params.mockTestId,
    req.workspaceId,
    req.query.page,
  );

  res.setHeader("Content-Type", "image/png");
  // Never cached - unlike a saved diagram (question-assets.controller.js's
  // serveDiagram, which sets a real Cache-Control since the same asset
  // is served repeatedly), a fetched page is a one-off preview a
  // reviewer is about to crop, not a stable asset with its own URL
  // anyone else would ever request again.
  res.setHeader("Cache-Control", "no-store");
  if (totalPages) {
    res.setHeader("X-Total-Pages", String(totalPages));
    // Without this, the browser silently hides X-Total-Pages from
    // frontend JS on this cross-origin request (frontend/backend run on
    // different origins - see app.js's CORS setup) - custom response
    // headers aren't in the small CORS-safelisted set (Content-Type,
    // Cache-Control, etc.) that's exposed by default. Easy to miss
    // entirely in local dev if frontend and backend ever happen to share
    // an origin there, only to silently break once actually deployed
    // cross-origin.
    res.setHeader("Access-Control-Expose-Headers", "X-Total-Pages");
  }
  res.send(buffer);
}
