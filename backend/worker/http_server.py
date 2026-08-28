"""
Lets the worker run as a Render Web Service instead of a Background
Worker - Background Workers have no free tier on Render (nor do Cron
Jobs), but Web Services do, because they hold a port a free instance can
be spun down/woken by. This module's only job is to give the worker
something on that port: an HTTP endpoint that kicks off job processing
in the background and returns immediately, triggered by
worker-runner.js#kickWorker right when a job is queued (an external
pinger like cron-job.org is an optional backstop, not required - see
kickWorker's own comment).

Deploy this instead of worker.py as the service's start command:
    python -m worker.http_server

Concurrency model - read this before changing anything here:
  Each successful /run acquires ONE of WORKER_CONCURRENCY slots (a
  threading.Semaphore, not a single lock) and spawns a thread that holds
  that slot for as long as there's queued work to claim, releasing it
  once a claim attempt comes up empty. This means several kicks arriving
  close together - the exact case that motivated this rewrite - each get
  their OWN slot and run genuinely concurrently, rather than the first
  kick's slow job blocking every other kick until it finishes.

  An EARLIER version of this file used a single global lock instead: one
  /run started a full run_once() pass (its own internal thread pool
  claiming up to MAX_JOBS_PER_RUN jobs), and any kick arriving while that
  pass was still in flight could only set a "do one more pass later"
  flag - even though run_once()'s OTHER threads had already sat idle
  since finding nothing at the very start of that pass. A second user's
  upload would sit queued, doing nothing, for as long as the first
  user's job took to finish completely - sometimes minutes - instead of
  starting immediately in the spare capacity that was sitting right
  there unused. That's the exact bug this rewrite fixes; this file no
  longer uses run_once() or MAX_JOBS_PER_RUN at all, since the semaphore
  itself is what bounds total concurrency now, per-slot, not per-pass.

  _recheck_requested is a narrower safety net for one remaining gap: if
  ALL slots are busy when a kick arrives (so it can't start a thread of
  its own), and by unlucky timing every currently-running slot's very
  next claim attempt comes up empty at the same time, every slot could
  exit and release simultaneously with that job never having gotten a
  slot at all. Setting this flag makes any slot about to exit take one
  more look first instead - cheap, and closes that gap without
  reintroducing the old single-lock bottleneck.
"""

import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .config import WORKER_CONCURRENCY
from .worker import process_next_job

WORKER_TRIGGER_SECRET = os.environ.get("WORKER_TRIGGER_SECRET", "").strip()
PORT = int(os.environ.get("PORT", "10000"))

_slot_semaphore = threading.Semaphore(WORKER_CONCURRENCY)
# See the module docstring's last paragraph - set/clear/is_set are each
# already atomic on their own, so no separate lock is needed around this
# despite multiple threads touching it.
_recheck_requested = threading.Event()


def _hold_slot_and_drain():
    """
    Runs on its own thread, holding one concurrency slot for as long as
    there's queued work this thread can claim - releases the slot only
    once a claim attempt finds nothing (checking _recheck_requested once
    more first - see the module docstring).
    """
    try:
        while True:
            _recheck_requested.clear()
            handled = process_next_job()
            if not handled and not _recheck_requested.is_set():
                return
    finally:
        _slot_semaphore.release()


def trigger_processing():
    """
    Called from do_POST below. Returns True if this kick got its own
    slot and started a thread, False if every slot was already busy (in
    which case the job this kick was for is still safely queued - see
    _recheck_requested above for how it still gets picked up).
    """
    if _slot_semaphore.acquire(blocking=False):
        threading.Thread(target=_hold_slot_and_drain, daemon=True).start()
        return True

    _recheck_requested.set()
    return False


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

        started = trigger_processing()
        if started:
            self._send_json(202, {"status": "started"})
        else:
            # Not an error - every slot is already busy processing other
            # jobs, which is the concurrency limit doing exactly what
            # it's supposed to. This job stays safely queued and will
            # get a slot the moment one frees up (see
            # _recheck_requested).
            self._send_json(
                202,
                {
                    "status": "queued",
                    "note": f"all {WORKER_CONCURRENCY} concurrency slots are busy; will run as soon as one frees up",
                },
            )

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