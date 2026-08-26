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
// spin down the rest of the time; keep any external pinger's interval
// long (e.g. 15-20 min) - it only needs to be a backstop for a kick that
// got lost, not the primary trigger.
const WORKER_SERVICE_URL = (process.env.WORKER_SERVICE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const WORKER_TRIGGER_SECRET = (process.env.WORKER_TRIGGER_SECRET || "").trim();

// The worker may be asleep (cold start ~30-60s) or mid-batch already -
// give the request enough time to land without hanging the event loop
// indefinitely if something's badly wrong (e.g. DNS/network failure).
const KICK_TIMEOUT_MS = 10_000;

export function kickWorker({ jobId } = {}) {
  if (!WORKER_SERVICE_URL || !WORKER_TRIGGER_SECRET) {
    // Not configured (e.g. local dev without the worker deployed) - fall
    // back silently to relying on the external pinger alone.
    return;
  }

  const url = `${WORKER_SERVICE_URL}/run?token=${encodeURIComponent(WORKER_TRIGGER_SECRET)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), KICK_TIMEOUT_MS);

  fetch(url, { method: "POST", signal: controller.signal })
    .then(async (response) => {
      if (!response.ok) {
        // 429 here just means a previous run is already in flight (see
        // http_server.py#_run_lock) - that run will pick this job up
        // anyway, so it's expected/harmless, not worth logging loudly.
        if (response.status !== 429) {
          const body = await response.text().catch(() => "");
          console.warn(
            `[worker-runner] Kick for job ${jobId} got ${response.status}: ${body}`,
          );
        }
      }
    })
    .catch((error) => {
      console.warn(
        `[worker-runner] Kick for job ${jobId} failed (worker will still be picked up by the next scheduled ping): ${error.message}`,
      );
    })
    .finally(() => clearTimeout(timeout));
}
