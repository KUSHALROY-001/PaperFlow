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

const WORKER_SERVICE_URL = (process.env.WORKER_SERVICE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const WORKER_TRIGGER_SECRET = (process.env.WORKER_TRIGGER_SECRET || "").trim();

// The worker may be asleep (Render's free tier docs put cold start at
// 30-60s once a service has spun down from 15 min of inactivity - which,
// by design, is the NORMAL state between uploads here, since we
// deliberately let it spin down to stay inside the free instance-hour
// budget) or mid-batch already. The timeout below has to comfortably
// outlast that cold start, or every kick that arrives while the worker
// is asleep - which given the above is a routine, expected case, not a
// rare edge case - aborts before the connection even completes and the
// job is left stranded until something else (a manual hit, or an
// external pinger, if one is even configured) wakes the worker instead.
// 90s gives real margin over Render's documented 30-60s worst case.
const KICK_TIMEOUT_MS = 90_000;

function kickDeployedWorker(jobId) {
  const url = `${WORKER_SERVICE_URL}/run?token=${encodeURIComponent(WORKER_TRIGGER_SECRET)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), KICK_TIMEOUT_MS);

  fetch(url, { method: "POST", signal: controller.signal })
    .then(async (response) => {
      if (!response.ok) {
        // A 429 here would mean the worker is unexpectedly still on the
        // older lock-and-drop behavior - it shouldn't happen with the
        // current http_server.py, which returns 202 (still a success
        // status, so this branch isn't even reached) and guarantees an
        // extra pass instead of dropping the kick. Logged just in case
        // an older worker build is deployed.
        const body = await response.text().catch(() => "");
        console.warn(
          `[worker-runner] Kick for job ${jobId} got ${response.status}: ${body}`,
        );
      }
    })
    .catch((error) => {
      console.warn(
        `[worker-runner] Kick for job ${jobId} failed (worker will still be picked up by the next scheduled ping, if one is configured): ${error.message}`,
      );
    })
    .finally(() => clearTimeout(timeout));
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
  if (WORKER_SERVICE_URL && WORKER_TRIGGER_SECRET) {
    kickDeployedWorker(jobId);
    return;
  }

  // Neither configured is the expected local-dev state (no deployed
  // worker service exists to point WORKER_SERVICE_URL at) - fall back to
  // spawning one locally instead of silently doing nothing. A partially-
  // configured state (one var set, the other missing) is a genuine
  // misconfiguration rather than "this is local dev", so it's called out
  // instead of also silently falling back, which would otherwise hide a
  // typo'd env var behind working-by-accident local behavior.
  if (WORKER_SERVICE_URL || WORKER_TRIGGER_SECRET) {
    console.warn(
      `[worker-runner] Job ${jobId} queued, but only one of WORKER_SERVICE_URL/WORKER_TRIGGER_SECRET is set - both are required to kick the deployed worker. Falling back to a local spawn, which is almost certainly not what you want outside local dev.`,
    );
  }

  spawnLocalWorkerOnce(jobId);
}
