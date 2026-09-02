// Tells the already-deployed Python worker (backend/worker/http_server.py,
// a separate Render Web Service) that a job is waiting, right when it's
// queued - instead of relying only on an external pinger (cron-job.org
// etc.) polling on a fixed schedule.
//
// This is deliberately fire-and-forget:
//   - We do NOT await this before responding to the upload request. The
//     job is already safely committed to processing_jobs by the time this
//     runs; the kick is purely a latency optimization; job processing
//     works correctly with zero kicks, just slower (waiting for the next
//     scheduled external ping).
//   - Any failure here (worker asleep and still cold-starting, network
//     blip, timeout, wrong/missing secret) is logged and swallowed, never
//     thrown - a user's upload must never fail because the kick failed.
//
// Why this exists instead of pinging on a short interval from
// cron-job.org: Render's free tier grants a shared 750 instance-hours/
// month across a workspace's free services. A service that's polled
// every ~1 minute never gets the 15-minutes-idle chance to spin down, so
// it runs ~24/7 - which alone is close to the entire monthly budget, and
// pushes a workspace with more than one always-on free service over the
// limit (Render then suspends every free service in the workspace until
// next month). Kicking directly on upload means the worker is normally
// only briefly awake right when there's real work, and can be left to
// spin down the rest of the time. An external pinger is now entirely
// OPTIONAL (not a "keep the interval long" backstop, per an earlier
// version of this comment) - see the local-dev branch below and
// kickWorker's own doc comment for the reasoning on why a lost kick is an
// acceptable risk to accept in exchange for not needing one at all.
import { spawn } from "node:child_process";
import https from "node:https";

const WORKER_SERVICE_URL = (process.env.WORKER_SERVICE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const WORKER_TRIGGER_SECRET = (process.env.WORKER_TRIGGER_SECRET || "").trim();

// Relay hop added after confirming (see docs/engineering-log/DEBUG_LOG.md,
// worker cold-start investigation) that the Node backend's own outbound IP
// gets a 429 from Render/Cloudflare's edge specifically when it calls the
// worker directly - before any of our code on either side ever runs, and
// regardless of the curl-spoofed headers below - while every non-Render
// origin tested (curl.exe, Hoppscotch, the debug endpoint's own request)
// succeeded from the same worker hostname at the same moment, with DNS/
// remoteAddress confirmed identical between Node's container and an
// outside machine. That rules out headers and routing as the cause and
// points at the Node backend's own outbound IP specifically. Routing the
// wake call through a small Cloudflare Worker means the request that
// actually reaches the worker comes from Cloudflare's network, not
// Render's - sidestepping the blocked pattern rather than continuing to
// try to out-guess it. Kept as a second, parallel attempt alongside the
// direct kick below (not a replacement), since the direct path may
// recover on its own and costs nothing extra when it works.
const RELAY_URL = (process.env.WAKE_RELAY_URL || "").trim();
const RELAY_SHARED_SECRET = (process.env.RELAY_SHARED_SECRET || "").trim();

// EVERY test across this whole investigation shows the same split:
// - A single request, sent once and left to wait (curl.exe, and both
//   .bat test scripts) -> always succeeds, typically in 25-45s.
// - A burst of many requests fired every 8s (an earlier version of this
//   loop) -> consistently got an immediate 502 on every single attempt,
//   with the worker's own Render logs showing no new "Running..." line
//   at all while that was happening.
// - Even ONE patient, non-bursty request from Node's fetch() -> STILL
//   got an immediate 502, with the worker's logs staying just as silent.
//   That ruled out timing/repetition as the cause entirely: curl.exe
//   hitting the exact same URL, same method, same moment in the idle
//   cycle, works every time; fetch() never even triggers a wake attempt.
//
// The one real difference left between those two clients is what they
// send, not how often. Comparing them directly: curl sends a bare
// User-Agent: curl/x.x.x and Accept: */*, nothing else notable. Node's
// fetch() sends User-Agent: node AND a bare sec-fetch-mode: cors header
// with no accompanying Origin/Referer - a combination that normally only
// comes from an actual browser fetch() call, not a server-to-server
// request, and exactly the kind of inconsistency a bot-detection layer
// looks for. fetch()'s sec-fetch-mode is hard-coded into its
// implementation and can't be removed via the headers option (verified
// locally - overriding it silently has no effect), so this now uses
// Node's raw https module instead, specifically because it sends nothing
// but the headers listed below - no forced fetch-spec headers - which is
// about as close to curl's own signature as this codebase can get.
//
// UPDATE: the header-spoofing change above did NOT fix it - a direct
// kick with User-Agent: curl/8.5.0 still got an immediate, silent 502/429
// from the Node backend's own IP, while curl.exe and a third-party
// origin (Hoppscotch) hitting the exact same URL at the exact same
// moment succeeded. DNS resolution and remoteAddress from inside the
// Node container were confirmed identical to an outside machine's, which
// rules out internal/private-network routing too. So headers were never
// the actual cause - this file's own KICK_USER_AGENT override is kept
// only because it's harmless, not because it's load-bearing. The RELAY_*
// path above is the fix that's actually been evidenced; see its own
// comment.
const KICK_USER_AGENT = "curl/8.5.0";

// Kept small and widely spaced (not a rapid burst) for the same reason
// as before: nothing here should recreate a pattern that hasn't worked.
const KICK_TIMEOUT_MS = 120_000;
const KICK_RETRYABLE_STATUSES = new Set([502, 503, 504]);
const KICK_MAX_ATTEMPTS = 3;
const KICK_RETRY_DELAY_MS = 120_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncateBody(body) {
  // Render's 502 page is a huge HTML blob - never dump it into API logs.
  const text = (body || "").trim();
  if (!text) return "";
  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
    return "[HTML error page truncated]";
  }
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

// Raw https.request instead of fetch() - see the module comment above
// for why. Resolves with { statusCode, body } on any completed response
// (including a 502/503/504 - those are not request failures at this
// layer), rejects only on an actual network-level failure or the
// KICK_TIMEOUT_MS timeout.
function postOnce(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: "POST",
        headers: {
          "User-Agent": KICK_USER_AGENT,
          Accept: "*/*",
        },
        timeout: timeoutMs,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, body });
        });
        res.on("error", reject);
      },
    );

    req.on("timeout", () => {
      // Matches AbortController's old role - this rejects via the
      // subsequent 'error' event, not directly, since destroy() always
      // emits one.
      req.destroy(new Error(`request timed out after ${timeoutMs}ms`));
    });
    req.on("error", reject);
    req.end();
  });
}

async function kickDeployedWorker(jobId) {
  const url = `${WORKER_SERVICE_URL}/run?token=${encodeURIComponent(WORKER_TRIGGER_SECRET)}`;

  for (let attempt = 1; attempt <= KICK_MAX_ATTEMPTS; attempt++) {
    try {
      const { statusCode, body } = await postOnce(url, KICK_TIMEOUT_MS);

      if (statusCode >= 200 && statusCode < 300) {
        console.info(
          `[worker-runner] Kick for job ${jobId} accepted (${statusCode}) on attempt ${attempt}`,
        );
        return;
      }

      const retryable = KICK_RETRYABLE_STATUSES.has(statusCode);
      const truncated = truncateBody(body);

      console.warn(
        `[worker-runner] Kick for job ${jobId} got ${statusCode} on attempt ${attempt}/${KICK_MAX_ATTEMPTS}` +
          (truncated ? `: ${truncated}` : "") +
          (retryable && attempt < KICK_MAX_ATTEMPTS
            ? ` - waiting ${KICK_RETRY_DELAY_MS / 1000}s before trying once more (not retrying quickly on purpose - see this file's module comment)`
            : ""),
      );

      if (!retryable || attempt === KICK_MAX_ATTEMPTS) {
        return;
      }
    } catch (error) {
      const retryable =
        /timed out|ECONNREFUSED|ENOTFOUND|ECONNRESET|socket|network/i.test(
          error?.message || "",
        );

      console.warn(
        `[worker-runner] Kick for job ${jobId} failed on attempt ${attempt}/${KICK_MAX_ATTEMPTS}: ${error.message}` +
          (retryable && attempt < KICK_MAX_ATTEMPTS
            ? ` - waiting ${KICK_RETRY_DELAY_MS / 1000}s before trying once more`
            : " (job stays queued until a later successful kick)"),
      );

      if (!retryable || attempt === KICK_MAX_ATTEMPTS) {
        return;
      }
    }

    await sleep(KICK_RETRY_DELAY_MS);
  }
}

// Second, independent wake attempt - see the RELAY_URL/RELAY_SHARED_SECRET
// module comment above for why this exists. Fired in parallel with
// kickDeployedWorker, not as a fallback after it fails: either one
// landing is enough, and there's no reason to wait out the direct kick's
// own retry/timeout budget (which can run up to 2 * 120s = 4 minutes
// before before giving up) before trying the path that's actually been
// reliable. Uses the relay's own RELAY_SHARED_SECRET, not
// WORKER_TRIGGER_SECRET - the relay is the only thing that ever holds
// the real worker secret, so a leaked relay URL alone can't be used to
// hit the worker directly. Single attempt, no retry loop here - the
// Cloudflare Worker itself is not expected to be cold/asleep the way the
// Render worker is, so a failure here is either a real network blip
// (rare) or the underlying worker call it makes failing for the same
// reasons kickDeployedWorker already logs and retries independently.
async function kickViaRelay(jobId) {
  if (!RELAY_URL || !RELAY_SHARED_SECRET) return;

  try {
    const res = await fetch(RELAY_URL, {
      method: "POST",
      headers: { "x-relay-token": RELAY_SHARED_SECRET },
    });
    const responseBody = await res.json().catch(() => ({}));
    console.info(
      `[worker-runner] Relay kick for job ${jobId}: relay responded ${res.status}, worker responded ${responseBody.workerStatus}`,
    );
  } catch (error) {
    console.warn(
      `[worker-runner] Relay kick for job ${jobId} failed: ${error.message}`,
    );
  }
}

// Local-dev equivalent of kickDeployedWorker above: there's no separate
// deployed HTTP worker to POST /run at when running locally (that's the
// whole reason WORKER_SERVICE_URL is unset here) - the worker only runs
// when someone manually opens a second terminal and runs `npm run
// worker`/`worker:once`. Spawning `--once` directly, the same way the
// old pre-split-service architecture used to (before the worker moved to
// its own deployed process - see this file's own git history), closes
// that gap for local dev specifically: an upload starts processing
// immediately without a second terminal, matching what kickWorker
// already does against a deployed worker.
//
// Safe to fire once per upload even if several land close together (the
// exact scenario that prompted this - three accounts uploading within
// moments of each other): each spawn is an independent `python -m
// worker.worker --once` process, and claim_next_job's `FOR UPDATE SKIP
// LOCKED` (db.py) means two of these running concurrently can never both
// claim the same row - at worst it's a few redundant Python process
// launches that immediately find nothing left to claim, not a
// correctness problem.
const PYTHON_COMMAND = process.env.PYTHON_COMMAND || "python";

function spawnLocalWorkerOnce(jobId) {
  const child = spawn(PYTHON_COMMAND, ["-B", "-m", "worker.worker", "--once"], {
    cwd: new URL("../../", import.meta.url).pathname,
    stdio: "inherit",
    detached: true,
  });

  // Deliberately NOT awaited/joined - same fire-and-forget contract as
  // kickDeployedWorker. unref() lets this backend process exit cleanly
  // (e.g. during `npm run dev`'s restart-on-change) without waiting on
  // the spawned worker to finish first.
  child.unref();

  child.on("error", (error) => {
    // ENOENT here almost always means PYTHON_COMMAND doesn't resolve on
    // this machine (e.g. it needs to be "python3") - worth a clear
    // message rather than a bare stack trace, since this is the one
    // failure mode a developer setting this up for the first time is
    // likely to actually hit.
    console.warn(
      `[worker-runner] Could not spawn local worker for job ${jobId} (tried "${PYTHON_COMMAND}" - set PYTHON_COMMAND if that's not the right command on this machine): ${error.message}`,
    );
  });
}

export function kickWorker({ jobId } = {}) {
  // Render (and most hosts) set one of these when the API is running in
  // a real deployment. Local spawn cannot reach the separate worker
  // service there - if we fall through without WORKER_SERVICE_URL, jobs
  // sit "queued" forever until someone hits /run by hand (curl / cron).
  // That is exactly the symptom of "upload does nothing until I curl".
  const isDeployed =
    process.env.RENDER === "true" ||
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.RENDER_SERVICE_ID);

  if (WORKER_SERVICE_URL && WORKER_TRIGGER_SECRET) {
    console.info(
      `[worker-runner] Kicking deployed worker for job ${jobId} at ${WORKER_SERVICE_URL}/run` +
        (RELAY_URL && RELAY_SHARED_SECRET ? " (direct + relay, parallel)" : ""),
    );
    // Fire-and-forget: retries run in the background so the upload
    // response is not held open for the full cold-start window. Both
    // attempts fire without waiting on each other - see kickViaRelay's
    // own comment for why this is parallel, not a fallback chain.
    void kickDeployedWorker(jobId).catch((error) => {
      console.warn(
        `[worker-runner] Direct kick for job ${jobId} ended with unexpected error: ${error.message}`,
      );
    });
    void kickViaRelay(jobId);
    return;
  }

  if (isDeployed) {
    // Do NOT spawn local Python on the API box - it has no worker deps
    // and is not the worker service. Fail loud so Render logs show why
    // the job is stuck queued.
    console.error(
      `[worker-runner] Job ${jobId} queued but WORKER_SERVICE_URL and/or WORKER_TRIGGER_SECRET are missing on this API service. ` +
        `Set BOTH on the Node backend (same secret as the worker). Until then jobs will stay queued until something else hits the worker /run endpoint.`,
    );
    return;
  }

  // Local-dev only: neither env is set → spawn python -m worker.worker --once
  if (WORKER_SERVICE_URL || WORKER_TRIGGER_SECRET) {
    console.warn(
      `[worker-runner] Job ${jobId} queued, but only one of WORKER_SERVICE_URL/WORKER_TRIGGER_SECRET is set - both are required to kick the deployed worker. Falling back to a local spawn, which is almost certainly not what you want outside local dev.`,
    );
  }

  spawnLocalWorkerOnce(jobId);
}
