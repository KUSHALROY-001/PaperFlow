// Calls the worker's POST /generate-template (backend/worker/http_server.py)
// - a SYNCHRONOUS, awaited round trip, the same pattern
// pdf-page-render-client.js already uses for GET /render-page and for the
// same reason: this is one lightweight AI JSON-generation call (no PDF, no
// batching), not the heavier async job-queue pattern
// generate_from_existing/notes-based question generation uses. Lives in
// its own file rather than bolted onto pdf-page-render-client.js since
// that file's name and every comment in it is specifically about PDF page
// rendering - this shares only the "synchronous worker call" shape, not
// the subject matter.
//
// Reuses the exact same WORKER_SERVICE_URL/WORKER_TRIGGER_SECRET env vars
// every other worker-calling file already uses - same deployed worker,
// same internal trust boundary.
import { httpError } from "./http-error.js";

const WORKER_SERVICE_URL = (process.env.WORKER_SERVICE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const WORKER_TRIGGER_SECRET = (process.env.WORKER_TRIGGER_SECRET || "").trim();

// Sized for the worst case, not the typical one: Gemini's grounded flow
// (see gemini_provider.py#generate_template_json) makes TWO sequential AI
// calls, not one - a search-grounding call followed by a schema-
// constrained structuring call - each individually bounded by the
// worker's own AI_TIMEOUT_SECONDS (90s by default). OpenAI's path stays
// single-call, but this timeout has to cover whichever provider is
// actually configured, plus the same Render free-tier cold-start
// allowance pdf-page-render-client.js's RENDER_TIMEOUT_MS budgets for.
// Realistic runs finish in well under this; it only matters when
// something is already running slow.
const GENERATE_TIMEOUT_MS = 150_000;

export async function generateTemplateFromExamName(examName) {
  if (!WORKER_SERVICE_URL || !WORKER_TRIGGER_SECRET) {
    throw httpError(
      503,
      "AI template generation isn't configured (WORKER_SERVICE_URL/WORKER_TRIGGER_SECRET) - this feature requires the deployed worker service.",
    );
  }

  const url = `${WORKER_SERVICE_URL}/generate-template?token=${encodeURIComponent(
    WORKER_TRIGGER_SECRET,
  )}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ examName }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw httpError(
        504,
        "Generating a template took too long (the worker may be waking up from being idle - try again in a moment).",
      );
    }
    throw httpError(
      502,
      `Could not reach the template generator: ${error.message}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    // The worker's own responses are always JSON (see
    // http_server.py's _send_json calls in _handle_generate_template) -
    // a non-JSON body here means something in front of it (a proxy, a
    // crash page) returned something else instead.
    throw httpError(
      502,
      `Template generator returned an unreadable response (${response.status})`,
    );
  }

  if (!response.ok) {
    // Mirrors pdf-page-render-client.js's status mapping: the worker's
    // own 429 (all generation slots busy), 503 (no AI provider
    // configured), and 400 (missing examName - shouldn't happen given
    // requiredString below, but the worker validates independently)
    // pass through as-is since they're specific and actionable; anything
    // else becomes a 502, since from this backend's point of view an
    // unexpected failure in an upstream service is a bad-gateway
    // situation, not this request's own fault.
    const status = [429, 503, 400].includes(response.status)
      ? response.status
      : 502;
    throw httpError(status, body?.error || `Template generator returned ${response.status}`);
  }

  return body.template;
}
