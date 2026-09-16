// Calls the worker's POST /generate-template (backend/worker/http_server.py)
// after waking the Render worker the same way job processing does:
// Cloudflare relay first (WAKE_RELAY_URL + x-relay-token). A direct hit
// on WORKER_SERVICE_URL from this API's IP does not spin the free worker
// up - Render/Cloudflare's edge returns 429/502 before Python starts.
// worker-runner.js#wakeWorkerViaRelay is the path that actually works.
import { httpError } from "./http-error.js";
import { wakeWorkerViaRelay, IS_LOCAL_WORKER } from "./worker-runner.js";

const WORKER_SERVICE_URL = (process.env.WORKER_SERVICE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const WORKER_TRIGGER_SECRET = (process.env.WORKER_TRIGGER_SECRET || "").trim();
const RELAY_URL = (process.env.WAKE_RELAY_URL || "").trim();
const RELAY_SHARED_SECRET = (process.env.RELAY_SHARED_SECRET || "").trim();

// IS_LOCAL_WORKER now lives in worker-runner.js (single source of truth -
// see that file's comment). Whether the relay is even relevant at all is
// about WORKER_SERVICE_URL's own hostname, not about whether relay
// secrets happen to be configured - those are two different questions
// that can disagree (e.g. local .env pointing WORKER_SERVICE_URL at the
// hosted Render URL without also configuring WAKE_RELAY_URL/
// RELAY_SHARED_SECRET locally), and conflating them is what let a direct
// hit against a sleeping HOSTED worker slip through silently logged as
// if it were the safe local-worker case.

const GENERATE_TIMEOUT_MS = 150_000;
const WAKE_MAX_ATTEMPTS = 4;
const WAKE_RETRY_DELAYS_MS = [8_000, 12_000, 20_000];
const GENERATE_MAX_ATTEMPTS = 3;
const GENERATE_RETRY_DELAYS_MS = [8_000, 12_000];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonBody(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isEdgeColdStartFailure(statusCode, rawBody) {
  if (![429, 502, 503, 504].includes(statusCode)) return false;
  const json = parseJsonBody(rawBody);
  if (json && typeof json === "object") return false;
  return true;
}

function workerLooksAwake(wake) {
  if (wake?.skipped || wake?.error) return false;
  if (wake.relayStatus && wake.relayStatus >= 400) return false;
  const workerStatus = Number(wake.workerStatus);
  if (!Number.isFinite(workerStatus)) {
    // Relay returned 2xx but didn't echo workerStatus - treat as woken.
    return wake.relayStatus >= 200 && wake.relayStatus < 300;
  }
  return workerStatus >= 200 && workerStatus < 300;
}

async function wakeWorkerThroughCloudflare() {
  if (IS_LOCAL_WORKER) {
    console.info(
      "[template-generate] WORKER_SERVICE_URL is localhost - skipping Cloudflare relay wake (local worker must already be running)",
    );
    return { skipped: true };
  }

  if (!RELAY_URL || !RELAY_SHARED_SECRET) {
    // WORKER_SERVICE_URL points at a real (non-localhost) host but the
    // relay isn't configured - this is a genuine misconfiguration, not
    // the "must be local dev" situation the old check conflated it with.
    // A direct hit here is a known dead end (see this file's top comment
    // and worker-runner.js's cold-start investigation: Render/Cloudflare's
    // edge blocks this API's own outbound IP before the sleeping worker's
    // Python process ever starts), so fail with a clear, actionable
    // message instead of silently attempting - and failing - a direct
    // call that's already been confirmed not to work.
    throw httpError(
      503,
      "AI template generation against the hosted worker requires WAKE_RELAY_URL and RELAY_SHARED_SECRET to be configured - a direct hit to a sleeping Render worker is blocked at the edge before it can wake up.",
    );
  }

  let lastWake = null;
  for (let attempt = 1; attempt <= WAKE_MAX_ATTEMPTS; attempt++) {
    lastWake = await wakeWorkerViaRelay();
    console.info(
      `[template-generate] Cloudflare relay wake attempt ${attempt}/${WAKE_MAX_ATTEMPTS}: ` +
        (lastWake.error
          ? lastWake.error
          : `relay ${lastWake.relayStatus}, worker ${lastWake.workerStatus}`),
    );

    if (workerLooksAwake(lastWake)) return lastWake;

    if (attempt < WAKE_MAX_ATTEMPTS) {
      await sleep(WAKE_RETRY_DELAYS_MS[attempt - 1] || 15_000);
    }
  }

  throw httpError(
    503,
    "The AI service is still starting after being idle. Please try again in a moment.",
  );
}

export async function generateTemplateFromExamName(examName) {
  if (!WORKER_SERVICE_URL || !WORKER_TRIGGER_SECRET) {
    throw httpError(
      503,
      "AI template generation isn't configured (WORKER_SERVICE_URL/WORKER_TRIGGER_SECRET) - this feature requires the deployed worker service.",
    );
  }

  await wakeWorkerThroughCloudflare();

  const url = `${WORKER_SERVICE_URL}/generate-template?token=${encodeURIComponent(
    WORKER_TRIGGER_SECRET,
  )}`;

  let lastError = null;

  for (let attempt = 1; attempt <= GENERATE_MAX_ATTEMPTS; attempt++) {
    try {
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
      } finally {
        clearTimeout(timeout);
      }

      const raw = await response.text();
      const parsed = parseJsonBody(raw);

      if (response.ok) {
        if (!parsed) {
          throw httpError(
            502,
            `Template generator returned an unreadable response (${response.status})`,
          );
        }
        return parsed.template;
      }

      if (isEdgeColdStartFailure(response.status, raw)) {
        lastError = httpError(
          503,
          "The AI service is still starting after being idle. Please try again in a moment.",
        );
        console.warn(
          `[template-generate] Direct generate still saw edge ${response.status} on attempt ${attempt}/${GENERATE_MAX_ATTEMPTS} - re-waking via Cloudflare relay`,
        );
        if (attempt < GENERATE_MAX_ATTEMPTS) {
          await wakeWorkerThroughCloudflare();
          await sleep(GENERATE_RETRY_DELAYS_MS[attempt - 1] || 10_000);
          continue;
        }
        throw lastError;
      }

      const status = [429, 503, 400].includes(response.status)
        ? response.status
        : 502;
      throw httpError(
        status,
        parsed?.error || `Template generator returned ${response.status}`,
      );
    } catch (error) {
      if (error.statusCode) throw error;

      const retryable =
        error.name === "AbortError" ||
        /timed out|ECONNREFUSED|ENOTFOUND|ECONNRESET|socket|network/i.test(
          error?.message || "",
        );
      lastError =
        error.name === "AbortError"
          ? httpError(
              504,
              "Generating a template took too long (the worker may be waking up from being idle - try again in a moment).",
            )
          : httpError(
              502,
              `Could not reach the template generator: ${error.message}`,
            );

      console.warn(
        `[template-generate] Generate attempt ${attempt}/${GENERATE_MAX_ATTEMPTS} failed: ${error.message}`,
      );

      if (!retryable || attempt === GENERATE_MAX_ATTEMPTS) {
        throw lastError;
      }

      await wakeWorkerThroughCloudflare();
      await sleep(GENERATE_RETRY_DELAYS_MS[attempt - 1] || 10_000);
    }
  }

  throw lastError;
}
