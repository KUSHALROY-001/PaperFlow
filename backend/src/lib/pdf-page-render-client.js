// Calls the worker's GET /render-page (backend/worker/http_server.py) -
// a SYNCHRONOUS, awaited round trip, unlike worker-runner.js#kickWorker's
// deliberately fire-and-forget job kick. This is a different kind of
// call entirely (interactive request/response, not "notify and move on"),
// which is why it lives in its own file rather than being bolted onto
// worker-runner.js: that file's whole framing - every comment in it - is
// built around "never await this, never let it fail the caller's
// request." This one is the opposite: the caller (pdf-page.controller.js)
// is specifically waiting on the actual image bytes.
//
// Reuses the exact same WORKER_SERVICE_URL/WORKER_TRIGGER_SECRET env vars
// worker-runner.js already uses - same deployed worker, same internal
// trust boundary (only this backend should be able to hit the worker's
// HTTP surface), no reason to introduce a second secret to keep in sync.
import { httpError } from "./http-error.js";

const WORKER_SERVICE_URL = (process.env.WORKER_SERVICE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const WORKER_TRIGGER_SECRET = (process.env.WORKER_TRIGGER_SECRET || "").trim();

// Same 90s reasoning as worker-runner.js's KICK_TIMEOUT_MS: the worker
// may be asleep (Render free-tier cold start, documented at 30-60s) when
// this request arrives - a shorter timeout would routinely abort on the
// exact case ("someone opens the editor after the worker's had 15+ idle
// minutes to spin down") this feature most needs to handle gracefully.
// Unlike a job kick, though, a timeout HERE has to surface to the user
// as a real, visible error (there's no queued job to silently pick up
// later) - see pdf-page.service.js's catch for how that's messaged.
const RENDER_TIMEOUT_MS = 90_000;

export async function renderPdfPage(storageKey, pageNumber) {
  if (!WORKER_SERVICE_URL || !WORKER_TRIGGER_SECRET) {
    throw httpError(
      503,
      "The PDF page renderer isn't configured (WORKER_SERVICE_URL/WORKER_TRIGGER_SECRET) - this feature requires the deployed worker service.",
    );
  }

  if (!storageKey || typeof storageKey !== "string") {
    throw httpError(
      404,
      "No source PDF storage key available for this mock test",
    );
  }

  const url = `${WORKER_SERVICE_URL}/render-page?token=${encodeURIComponent(
    WORKER_TRIGGER_SECRET,
  )}&storageKey=${encodeURIComponent(storageKey)}&page=${encodeURIComponent(
    pageNumber,
  )}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw httpError(
        504,
        "The PDF page renderer took too long to respond (it may be waking up from being idle - try again in a moment).",
      );
    }
    throw httpError(502, `Could not reach the PDF page renderer: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    // The worker's own error responses are JSON ({"error": "..."}) for
    // every non-200 case (see http_server.py's _send_json calls in
    // _handle_render_page) - surfaced as-is rather than a generic
    // message, since these are specific and actionable ("page 45 is out
    // of range - this PDF has 32 pages").
    let message = `Page renderer returned ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body - fall back to the generic message above.
    }
    // Render's own 429 (all render slots busy) and 400 (bad page number)
    // both map cleanly onto their own status here; anything else from
    // the worker becomes a 502, since from this backend's point of view
    // an unexpected failure in an UPSTREAM service is a bad-gateway
    // situation, not this request's own fault.
    const status = response.status === 429 || response.status === 400
      ? response.status
      : 502;
    throw httpError(status, message);
  }

  const totalPages = Number(response.headers.get("x-total-pages")) || null;
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, totalPages };
}
