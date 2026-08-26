"""
Lets the worker run as a Render Web Service instead of a Background
Worker - Background Workers have no free tier on Render (nor do Cron
Jobs), but Web Services do, because they hold a port a free instance can
be spun down/woken by. This module's only job is to give the worker
something on that port: one HTTP endpoint that runs a single processing
pass (the same run_once() the --once CLI flag already calls) and
returns, triggered periodically by a free external scheduler instead of
running its own continuous run_forever() poll loop.

Deploy this instead of worker.py as the service's start command:
    python -m worker.http_server

Then point a free external pinger (cron-job.org, a GitHub Actions
scheduled workflow, UptimeRobot, etc.) at:
    POST https://<this-service>.onrender.com/run?token=<WORKER_TRIGGER_SECRET>
every few minutes. Each hit processes whatever's currently queued and
returns immediately - it is NOT a long-lived connection, so the pinger
doesn't need a long timeout.

Two things worth being deliberate about:
  - The endpoint requires WORKER_TRIGGER_SECRET (set as an env var, same
    place as the other secrets) as a query param - this service gets a
    public onrender.com URL like any other Web Service, and without a
    check here, anyone who found that URL could trigger job processing
    (or just hammer it) for free.
  - _run_lock stops two overlapping pings (a slow run plus an
    impatient pinger firing again before it finishes) from both calling
    run_once() at the same time - claim_next_job's FOR UPDATE SKIP
    LOCKED already prevents them from double-processing the SAME job,
    but there's no reason to let two Python processes hammer the DB
    concurrently over one HTTP wrapper when a simple lock avoids it
    entirely.
"""

import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .config import MAX_JOBS_PER_RUN
from .worker import run_once

WORKER_TRIGGER_SECRET = os.environ.get("WORKER_TRIGGER_SECRET", "").strip()
PORT = int(os.environ.get("PORT", "10000"))

_run_lock = threading.Lock()


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
            # A previous /run is still in flight - tell the pinger to
            # try again shortly rather than queueing up a second
            # concurrent run_once() call.
            self._send_json(429, {"error": "a run is already in progress"})
            return

        try:
            processed = run_once(MAX_JOBS_PER_RUN)
        except Exception as error:
            self._send_json(500, {"error": str(error)})
            return
        finally:
            _run_lock.release()

        self._send_json(200, {"processed": processed})

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
