"""
Lets the worker run as a Render Web Service instead of a Background
Worker - Background Workers have no free tier on Render (nor do Cron
Jobs), but Web Services do, because they hold a port a free instance can
be spun down/woken by. This module gives the worker two things on that
port:

  - POST /run - kicks off background job processing and returns
    immediately, triggered by worker-runner.js#kickWorker right when a
    job is queued (an external pinger like cron-job.org is an optional
    backstop, not required - see kickWorker's own comment).
  - GET /render-page - a SYNCHRONOUS, interactive path: given a PDF's B2
    storage key and a page number, downloads the PDF and returns that one
    page rendered to PNG, waiting for the actual result rather than
    kicking off background work. Used by the question editor's "fetch
    this page from the original PDF" feature (for questions where
    extraction found no diagram to crop) - Node calls this directly and
    proxies the bytes back to the browser. This is a materially different
    usage pattern from /run's fire-and-forget kick, which is why it has
    its own separate concurrency pool (WORKER_RENDER_CONCURRENCY) rather
    than sharing /run's.

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
import ssl
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import fitz

from .config import AI_PDF_RENDER_SCALE, WORKER_CONCURRENCY, WORKER_RENDER_CONCURRENCY
from .storage import download_pdf_to_temp_file
from .worker import process_next_job

WORKER_TRIGGER_SECRET = os.environ.get("WORKER_TRIGGER_SECRET", "").strip()
PORT = int(os.environ.get("PORT", "10000"))
# Render (and similar PaaS platforms) terminate TLS at their edge and proxy
# plain HTTP to the container on $PORT - the container itself has no public
# IP, so that hop never carries plaintext outside Render's own network, and
# binding this server to HTTPS directly there would break the deployment
# (Render's proxy speaks HTTP to the app, not HTTPS). If this ever runs
# somewhere WITHOUT an edge TLS terminator - i.e. exposed to the public
# internet directly on PORT - set WORKER_TLS_CERT_FILE/WORKER_TLS_KEY_FILE
# so requests (including the WORKER_TRIGGER_SECRET token) are encrypted
# in transit (jssecurity/python:S5332: don't serve plain HTTP to the
# public internet).
WORKER_TLS_CERT_FILE = os.environ.get("WORKER_TLS_CERT_FILE", "").strip()
WORKER_TLS_KEY_FILE = os.environ.get("WORKER_TLS_KEY_FILE", "").strip()

_slot_semaphore = threading.Semaphore(WORKER_CONCURRENCY)
# See the module docstring's last paragraph - set/clear/is_set are each
# already atomic on their own, so no separate lock is needed around this
# despite multiple threads touching it.
_recheck_requested = threading.Event()

# A wholly separate pool from _slot_semaphore above - see
# WORKER_RENDER_CONCURRENCY's own comment in config.py for why this isn't
# just reusing the job-processing semaphore.
_render_semaphore = threading.Semaphore(WORKER_RENDER_CONCURRENCY)


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


def render_page(storage_key, page_number):
    """
    Downloads the PDF at `storage_key` from B2 and renders ONE page to
    PNG bytes, at the exact same AI_PDF_RENDER_SCALE the extraction
    pipeline itself renders pages at (gemini_provider.py) - so a page a
    user manually fetches to crop a diagram from looks the same
    resolution/quality as what the AI extractor already saw for that
    same page, not a mismatched second rendering convention.

    page_number is 1-indexed (matching question_slots.source_page's own
    convention - see migrations/001_initial_schema.sql's
    `source_page > 0` check), converted to fitz's 0-indexed page access
    here rather than asking every caller to remember to do that
    conversion themselves.

    Returns (png_bytes, total_page_count). Raises ValueError for a
    page_number outside the PDF's actual range - callers turn that into a
    400 with total_page_count so the client can correct itself, not a
    generic 500.
    """
    local_path = download_pdf_to_temp_file(storage_key)
    try:
        with fitz.open(local_path) as document:
            total_pages = document.page_count
            if page_number < 1 or page_number > total_pages:
                raise ValueError(
                    f"page {page_number} is out of range - this PDF has {total_pages} page(s)"
                )
            page = document.load_page(page_number - 1)
            pixmap = page.get_pixmap(
                matrix=fitz.Matrix(AI_PDF_RENDER_SCALE, AI_PDF_RENDER_SCALE)
            )
            return pixmap.tobytes("png"), total_pages
    finally:
        # Caller-owns-cleanup, same contract download_pdf_to_temp_file's
        # own docstring documents for worker.py's job-processing path -
        # this is just a second caller of that same contract.
        local_path.unlink(missing_ok=True)


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_png(self, png_bytes, total_pages):
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(png_bytes)))
        # Custom header (not a JSON body) so the frontend learns the PDF's
        # total page count on the SAME response as the image itself,
        # rather than needing a separate round trip just to know how far
        # "next page" navigation can go.
        self.send_header("X-Total-Pages", str(total_pages))
        self.end_headers()
        self.wfile.write(png_bytes)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/":
            # Render (and most uptime pingers) probe / by default -
            # respond 200 here so those don't get logged as errors.
            self._send_json(200, {"status": "ok"})
            return
        if parsed.path == "/render-page":
            self._handle_render_page(parsed)
            return
        self._send_json(404, {"error": "not found"})

    def _handle_render_page(self, parsed):
        if not WORKER_TRIGGER_SECRET:
            # Same reasoning as do_POST below - a misconfigured deploy
            # should fail loudly, not silently accept unauthenticated
            # requests to an endpoint that downloads whatever PDF it's
            # told to and burns render time on it.
            self._send_json(
                500, {"error": "WORKER_TRIGGER_SECRET is not configured"}
            )
            return

        query = parse_qs(parsed.query)
        provided_token = query.get("token", [""])[0]
        if provided_token != WORKER_TRIGGER_SECRET:
            self._send_json(403, {"error": "invalid or missing token"})
            return

        storage_key = query.get("storageKey", [""])[0]
        if not storage_key:
            self._send_json(400, {"error": "storageKey is required"})
            return

        try:
            page_number = int(query.get("page", [""])[0])
        except ValueError:
            self._send_json(400, {"error": "page must be an integer"})
            return

        # Bounded separately from job-processing concurrency (see
        # _render_semaphore's own comment) - blocking=False so a request
        # arriving when every render slot is already busy gets a clear,
        # immediate "try again shortly" instead of this handler thread
        # (and the HTTP connection behind it) sitting blocked
        # indefinitely waiting for a slot.
        if not _render_semaphore.acquire(blocking=False):
            self._send_json(
                429,
                {
                    "error": f"all {WORKER_RENDER_CONCURRENCY} render slots are busy - try again shortly"
                },
            )
            return

        try:
            png_bytes, total_pages = render_page(storage_key, page_number)
        except ValueError as error:
            self._send_json(400, {"error": str(error)})
            return
        except Exception as error:
            self._send_json(500, {"error": str(error)})
            return
        finally:
            _render_semaphore.release()

        self._send_png(png_bytes, total_pages)

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
        print(
        f"[INCOMING REQUEST] POST {self.path} from {self.client_address}",
        flush=True
        )
        
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
    scheme = "http"
    if WORKER_TLS_CERT_FILE and WORKER_TLS_KEY_FILE:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(certfile=WORKER_TLS_CERT_FILE, keyfile=WORKER_TLS_KEY_FILE)
        server.socket = ctx.wrap_socket(server.socket, server_side=True)
        scheme = "https"
    print(f"Worker HTTP wrapper listening on {scheme}://0.0.0.0:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()