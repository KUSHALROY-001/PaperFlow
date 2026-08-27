"""
Lets the worker run as a Render Web Service instead of a Background
Worker - Background Workers have no free tier on Render (nor do Cron
Jobs), but Web Services do, because they hold a port a free instance can
be spun down/woken by. This module's only job is to give the worker
something on that port: one HTTP endpoint that kicks off a single
processing pass (the same run_once() the --once CLI flag already calls)
in the background and returns immediately, triggered periodically by a
free external scheduler instead of running its own continuous
run_forever() poll loop.

Deploy this instead of worker.py as the service's start command:
    python -m worker.http_server

Then point a free external pinger (cron-job.org, a GitHub Actions
scheduled workflow, UptimeRobot, etc.) at:
    POST https://<this-service>.onrender.com/run?token=<WORKER_TRIGGER_SECRET>
every few minutes. Each hit starts processing whatever's currently
queued and returns right away - it does NOT wait for that processing to
finish (see the "fire-and-forget" note below for why), so the pinger
never needs a long timeout regardless of how long a pass actually takes.

Three things worth being deliberate about:
  - The endpoint requires WORKER_TRIGGER_SECRET (set as an env var, same
    place as the other secrets) as a query param - this service gets a
    public onrender.com URL like any other Web Service, and without a
    check here, anyone who found that URL could trigger job processing
    (or just hammer it) for free.
  - _run_lock stops two overlapping pings (a slow run plus an
    impatient pinger firing again before it finishes) from both calling
    run_once() at the same time - claim_next_job's FOR UPDATE SKIP
    LOCKED already prevents them from double-processing the SAME job,
    but there's no reason to let two Python threads hammer the DB
    concurrently over one HTTP wrapper when a simple lock avoids it
    entirely.
  - A /run that arrives while the lock is already held does NOT just get
    dropped with a bare "try again later" - it sets _rerun_requested,
    and the in-flight run loops back for one more run_once() pass as
    soon as its current one finishes, before releasing the lock. Without
    this: job A claims the only queued job and starts a slow, AI-heavy
    run; job B is then queued mid-run by a kick from a second user, but
    that kick just bounces off the held lock and (with nothing to
    remember it) is silently discarded - job B now waits for the next
    kick or the next slow cron backstop instead of being picked up the
    moment A's run frees up. _rerun_requested closes that gap.

Fire-and-forget, not request-scoped: earlier versions of this endpoint
ran run_once() synchronously and only wrote the HTTP response once it
returned. That works fine for a quick pass, but AI-heavy extraction runs
can legitimately take minutes - well past external pingers' own request
timeouts (cron-job.org's included). When that happens the pinger gives
up and closes its socket before the response is ever written, which
this server then sees as a bare BrokenPipeError in its logs on an
otherwise-successful run. Since the pinger was never going to wait
around anyway, there's nothing useful about blocking the response on
run_once() finishing - so /run now starts the work in a background
thread and responds immediately, and the pinger's own timeout stops
mattering at all. Actual results and errors go to Render's logs instead
of the HTTP response (see _process_in_background), which is where they
belonged anyway - a monitoring pinger isn't the audience for a process
job's output, a human checking logs is.
"""

import json
import os
import threading
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .config import MAX_JOBS_PER_RUN
from .worker import run_once

WORKER_TRIGGER_SECRET = os.environ.get("WORKER_TRIGGER_SECRET", "").strip()
PORT = int(os.environ.get("PORT", "10000"))

_run_lock = threading.Lock()
# Set by a /run that arrived while _run_lock was already held, so the
# in-flight run knows to do one more pass instead of exiting - see the
# module docstring above for why this exists. threading.Event's
# set/clear/is_set are each already atomic, so no extra lock is needed
# around it despite multiple threads touching it.
_rerun_requested = threading.Event()


def _process_in_background():
    """
    Runs on its own thread, entirely decoupled from whichever HTTP
    request's do_POST spawned it - that request has already responded
    and moved on by the time this starts looping. Holds _run_lock for
    its whole lifetime (released in `finally`), and honors
    _rerun_requested exactly as the old synchronous version did.

    Errors are logged in full here (traceback and all) rather than sent
    anywhere - there's no HTTP response left to carry them by the time
    an error could happen, which is also why the old truncate-the-error-
    message concern (some exceptions stringify huge - a failed bulk DB
    insert echoing its row data, an AI-provider error echoing back the
    prompt/document text it choked on) no longer applies: Render's log
    storage doesn't have cron-job.org's tiny response-size cap.
    """
    try:
        total_processed = 0
        while True:
            # Cleared before each pass (not after) so a kick that lands
            # *during* this pass - i.e. after we've already decided what
            # to claim - still sets the flag again and earns its own
            # extra pass afterward, rather than being mistaken for the
            # one that's about to run anyway.
            _rerun_requested.clear()
            try:
                total_processed += run_once(MAX_JOBS_PER_RUN)
            except Exception:
                print(
                    f"[http_server] background run_once() failed:\n{traceback.format_exc()}"
                )
                # Don't let one bad pass stop a rerun that was already
                # requested - same as a pass that succeeds, a pending
                # kick still deserves its own fresh attempt.
            if not _rerun_requested.is_set():
                break
        print(f"[http_server] background run finished, processed={total_processed}")
    finally:
        _run_lock.release()


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        # Render (and most uptime pingers) probe / by default - respond
        # 200 here so those don't get logged as errors, but don't run
        # any jobs from a bare GET. Only POST /run actually does work.
        if urlparse(self.path).path == "/":
            self._send_json(200, {"status": "ok"})
            return
        self._send_json(404, {"error": "not found"})

    def do_HEAD(self):
        # BaseHTTPRequestHandler returns 501 for HEAD unless a do_HEAD is
        # defined - some uptime/health-check tools (and Render itself, if
        # an HTTP Health Check Path is ever configured for this service
        # instead of the default TCP check) send HEAD rather than GET. A
        # 501 there would make an otherwise-healthy instance look
        # unhealthy, so mirror do_GET's status without a body.
        if urlparse(self.path).path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/run":
            self._send_json(404, {"error": "not found"})
            return

        if not WORKER_TRIGGER_SECRET:
            # Fail loudly rather than silently running with no auth at
            # all - a misconfigured deploy (forgot to set the secret)
            # should be obvious immediately, not discovered later as an
            # open, unauthenticated trigger sitting on the public internet.
            self._send_json(
                500, {"error": "WORKER_TRIGGER_SECRET is not configured"}
            )
            return

        provided_token = parse_qs(parsed.query).get("token", [""])[0]
        if provided_token != WORKER_TRIGGER_SECRET:
            self._send_json(403, {"error": "invalid or missing token"})
            return

        if not _run_lock.acquire(blocking=False):
            # A previous /run is still in flight - rather than dropping
            # this trigger, flag it so that run keeps going after its
            # current pass instead of exiting.
            _rerun_requested.set()
            self._send_json(
                202,
                {
                    "status": "queued",
                    "note": "a run is already in progress; it will do another pass for this once it finishes the current one",
                },
            )
            return

        # Lock acquired - hand off to a background thread and respond
        # immediately. This request is done as soon as this line
        # returns; it never waits on run_once() at all (see the
        # fire-and-forget note in the module docstring).
        thread = threading.Thread(target=_process_in_background, daemon=True)
        thread.start()
        self._send_json(202, {"status": "started"})

    def log_message(self, format, *args):
        # BaseHTTPRequestHandler logs every request to stderr by default,
        # formatted for a human terminal, not for Render's log viewer -
        # a plain print keeps each line readable there instead.
        print(f"[http_server] {self.address_string()} - {format % args}")


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Worker HTTP wrapper listening on 0.0.0.0:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()