from pathlib import Path
from dotenv import load_dotenv
import os
import tempfile


BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL")
POLL_INTERVAL_SECONDS = int(os.environ.get("WORKER_POLL_INTERVAL_SECONDS", "5"))
# Default of 8 assumes the primary deployment is http_server.py (a Render
# Web Service, triggered periodically by an external pinger like
# cron-job.org) rather than a continuously-running run_forever() process -
# see http_server.py's module docstring. Each /run hit should be able to
# drain a real batch of the queue, not just one job, or WORKER_CONCURRENCY
# below never gets a chance to do anything (run_once clips concurrency to
# min(concurrency, max_jobs), so max_jobs=1 forces fully-sequential
# processing no matter how high WORKER_CONCURRENCY is set).
#
# Kept modest (8, not e.g. 50) on purpose: a batch this size normally
# finishes within a minute or two even with several AI-heavy jobs sharing
# the 15/min Gemini gateway, so a ping every ~1 minute (the shortest
# interval cron-job.org's free plan allows) keeps up with the queue in
# small, fast chunks instead of one long-running request. Whether any one
# /run call happens to finish before or after the pinger's own timeout
# doesn't matter either way - http_server.py's _run_lock already stops a
# ping that looks "failed" to the pinger from starting a second run on top
# of one still going, so a raised timeout or a lower number here is not
# something that needs tuning for correctness, only for how large a
# backlog gets cleared per tick.
MAX_JOBS_PER_RUN = int(os.environ.get("WORKER_MAX_JOBS_PER_RUN", "8"))
# How many processing_jobs run in parallel THREADS within this one worker
# process, instead of one job fully finishing (download -> OCR -> parse ->
# every AI call -> DB writes) before the next job is even claimed. This is
# safe to raise because:
#   1. claim_next_job (db.py) claims with "FOR UPDATE OF pj SKIP LOCKED",
#      so concurrent claimers can never grab the same row.
#   2. Every DB access opens its own short-lived connection
#      (db.py#get_connection), so threads never share a connection.
#   3. The actual AI rate limit (AI_MAX_REQUESTS_PER_MINUTE) is enforced by
#      a MODULE-LEVEL lock in gemini_provider.py shared by every thread in
#      this process - raising this does NOT raise how many requests/minute
#      reach Gemini, it only lets more jobs' non-AI work (download, OCR,
#      parsing, DB writes) overlap instead of queueing behind each other.
# This only holds within a single process. If this worker is ever run as
# more than one OS process/container at the same time against the same
# GEMINI_API_KEY, each process gets its OWN rate-limit counter and the
# combined real request rate is concurrency * AI_MAX_REQUESTS_PER_MINUTE -
# the limiter would need to move to shared storage (e.g. a Postgres-backed
# counter) before that's safe.
WORKER_CONCURRENCY = int(os.environ.get("WORKER_CONCURRENCY", "4"))

# Separate resource pool from WORKER_CONCURRENCY above, deliberately - that
# one bounds background JOB PROCESSING threads (each holding a DB
# connection, doing AI calls, etc.); this one bounds concurrent
# /render-page requests (http_server.py), a synchronous, interactive path
# triggered by someone in the editor clicking "Fetch page" - a live
# request-response call, not a background task. Conflating the two pools
# would mean an editor session fetching a few PDF pages could starve
# actual job processing of its own concurrency slots, or vice versa.
# Small default: each render does a full B2 download + PyMuPDF page
# render, and unlike job processing there's no queue to fall back on if
# this is saturated - a request just waits briefly or gets a clear "busy"
# response instead of failing outright.
WORKER_RENDER_CONCURRENCY = int(os.environ.get("WORKER_RENDER_CONCURRENCY", "3"))

# Same reasoning as WORKER_RENDER_CONCURRENCY above, its own separate pool
# again - /generate-template (http_server.py) is a third distinct kind of
# synchronous request (one AI call, no PDF/B2 involved at all), triggered
# by someone clicking "Build with AI" on Create Template. Small default
# for the same reason: no queue to fall back on if saturated, just a
# quick "busy" response.
WORKER_TEMPLATE_GENERATION_CONCURRENCY = int(
    os.environ.get("WORKER_TEMPLATE_GENERATION_CONCURRENCY", "3")
)
AI_PROVIDER = os.environ.get("AI_PROVIDER", "disabled").strip().lower()


def _normalize_ai_model(raw_value):
    """
    Strips whitespace AND a matched pair of surrounding quote characters
    from AI_MODEL. The quotes case is not hypothetical - it's the single
    most common way this env var actually gets corrupted: someone copies
    an example like `AI_MODEL="gemini-2.5-flash-lite"` (quotes included,
    exactly as it'd appear in a .env file or shell export) into a
    dashboard env var field (Render, etc.) that does NOT interpret shell
    quoting - the literal `"` characters become part of the value. That
    value then gets pasted RAW into the request URL in gemini_provider.py
    (`.../models/{self.model}:generateContent`), and Gemini's API has no
    model literally named `"gemini-2.5-flash-lite"` (quotes included), so
    it 404s - a real, previously-unexplained case (see the 2026-09
    "HTTP Error 404" investigation this normalization comes from).

    Deliberately does NOT validate the value against a hardcoded list of
    known-good model names beyond this - Google adds new models often
    enough that a strict allowlist here would go stale and start
    rejecting perfectly valid new models. This only fixes copy-paste
    corruption that's unambiguously never a real model name.
    """
    value = raw_value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        value = value[1:-1].strip()
    return value


AI_MODEL = _normalize_ai_model(os.environ.get("AI_MODEL", ""))
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
# How many extracted questions are written to the database per
# transaction (and per diagram-upload flush) at the end of a job. The old
# behaviour was effectively "all of them": one transaction held open
# across every INSERT for the whole document, with every diagram PNG kept
# in memory until that single transaction committed. On a 100-page paper
# (~3000 questions) that is one transaction alive for minutes and tens of
# megabytes of crop bytes resident the entire time - the combination that
# made saving hang, time out, or get the worker OOM-killed on a small
# Render instance. Saving in small batches keeps each transaction short,
# lets each batch's diagram bytes be uploaded and freed immediately, and
# makes job progress advance smoothly instead of jumping 80 -> 100.
#
# 30 is deliberately small: the per-batch overhead (one extra round trip)
# is negligible next to the AI stage, while the peak memory held is
# bounded by the batch, not by the document.
QUESTION_WRITE_BATCH_SIZE = max(1, int(os.environ.get("QUESTION_WRITE_BATCH_SIZE", "30")))
AI_MAX_CHARS_PER_CHUNK = int(os.environ.get("AI_MAX_CHARS_PER_CHUNK", "12000"))
AI_TIMEOUT_SECONDS = int(os.environ.get("AI_TIMEOUT_SECONDS", "90"))
AI_PDF_PAGES_PER_CHUNK = int(os.environ.get("AI_PDF_PAGES_PER_CHUNK", "3"))
# How many vision chunks (each AI_PDF_PAGES_PER_CHUNK pages) from the SAME
# PDF are sent to Gemini concurrently, instead of one chunk's full
# request+retry cycle finishing before the next one even starts. This does
# NOT raise how many requests/minute actually reach Gemini - that's still
# capped by AI_MAX_REQUESTS_PER_MINUTE via the shared _rate_limit_lock in
# gemini_provider.py, which every chunk-thread still waits on. Raising this
# just lets more chunks queue up waiting their turn at once, so as soon as
# the per-minute window has room, the next chunk fires immediately instead
# of only after the previous chunk's response fully returned.
#
# Stacks with WORKER_CONCURRENCY: 4 jobs × 5 chunk-threads can mean up to
# 20 threads contending for the same 15/min budget. They queue at the
# limiter; they do not multiply the quota. Set to 1 to force sequential
# vision (regression-check against the old loop).
AI_VISION_CHUNK_CONCURRENCY = int(os.environ.get("AI_VISION_CHUNK_CONCURRENCY", "5"))
# Text-only cleanup uses the same bounded-concurrency approach as vision.
# Responses are still parsed and merged in source-page order by provider.py;
# this only overlaps network wait time. Gemini's shared request limiter
# continues to cap the real request rate across both text and vision work.
AI_TEXT_CHUNK_CONCURRENCY = max(
    1, int(os.environ.get("AI_TEXT_CHUNK_CONCURRENCY", "5"))
)
AI_PDF_RENDER_SCALE = float(os.environ.get("AI_PDF_RENDER_SCALE", "1.5"))
AI_GENERATE_FROM_NOTES = os.environ.get("AI_GENERATE_FROM_NOTES", "true").strip().lower() not in (
    "0",
    "false",
    "no",
    "off",
)
AI_NOTES_QUESTIONS_PER_CHUNK = int(os.environ.get("AI_NOTES_QUESTIONS_PER_CHUNK", "8"))
AI_NOTES_MAX_QUESTIONS = int(os.environ.get("AI_NOTES_MAX_QUESTIONS", "500"))
# Gemini's free tier is 15 requests/minute, 500/day (as of writing) - this
# defaults to the free-tier RPM ceiling so a fresh setup is safe out of the
# box, but is meant to be raised via env var on a paid tier where the real
# ceiling is much higher. See gemini_provider.py's rate limiter - this is
# enforced proactively (before a call, not just retried after a 429).
AI_MAX_REQUESTS_PER_MINUTE = int(os.environ.get("AI_MAX_REQUESTS_PER_MINUTE", "15"))
# A generated question flagged as a near-duplicate of something already in
# the workspace (similarity_score from question_duplicate_pairs) at or
# above this gets ONE automatic regeneration attempt rather than only
# appearing in the duplicate-groups report - see
# worker.py#regenerate_flagged_duplicates_for_mock_test. Deliberately
# higher than detect_duplicates_for_mock_test's own 0.55 detection
# threshold: a pair between 0.55 and this cutoff is genuinely ambiguous
# ("similar phrasing, might be a coincidence") and worth a human's actual
# judgment; a pair at or above this is close enough that spending an extra
# AI request to just rewrite it is almost always the right call.
AI_DUPLICATE_REGEN_THRESHOLD = float(
    os.environ.get("AI_DUPLICATE_REGEN_THRESHOLD", "0.70")
)
OCR_ENABLED = os.environ.get("OCR_ENABLED", "true").strip().lower() not in (
    "0",
    "false",
    "no",
    "off",
)
OCR_LANGUAGE = os.environ.get("OCR_LANGUAGE", "eng").strip()
OCR_RENDER_DPI = int(os.environ.get("OCR_RENDER_DPI", "220"))
TESSERACT_CMD = os.environ.get("TESSERACT_CMD", "").strip()

# Backblaze B2 - PDFs only. B2 speaks the S3 API, so boto3's plain S3
# client works against it unmodified once pointed at B2's own endpoint -
# no B2-specific SDK needed. KEY_ID/APPLICATION_KEY are B2's own naming
# for what boto3 calls the access key id / secret access key.
B2_ENDPOINT_URL = os.environ.get("B2_ENDPOINT_URL", "").strip()
B2_REGION = os.environ.get("B2_REGION", "").strip()
B2_BUCKET = os.environ.get("B2_BUCKET", "").strip()
B2_KEY_ID = os.environ.get("B2_KEY_ID", "").strip()
B2_APPLICATION_KEY = os.environ.get("B2_APPLICATION_KEY", "").strip()

# Cloudinary - diagram images only (both extracted crops and manual
# uploads - see storage.py). CLOUDINARY_URL, if set, is a single
# cloudinary://key:secret@cloud_name string the SDK parses on its own;
# the three separate vars are the fallback for anyone who'd rather set
# them individually.
CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL", "").strip()
CLOUDINARY_CLOUD_NAME = os.environ.get(
    "CLOUDINARY_CLOUD_NAME", os.environ.get("CLOUD_NAME", "")
).strip()
CLOUDINARY_API_KEY = os.environ.get(
    "CLOUDINARY_API_KEY", os.environ.get("API_KEY", "")
).strip()
CLOUDINARY_API_SECRET = os.environ.get(
    "CLOUDINARY_API_SECRET", os.environ.get("API_SECRET", "")
).strip()

# Self-heartbeat while a job is running. Render's free-tier web services
# spin down after ~15 minutes with no INBOUND HTTP traffic - NOT after 15
# minutes of CPU/thread idle. A background job thread (worker.py#process_job)
# can be genuinely busy the entire time on a large PDF, and Render still
# kills the container mid-job, because "busy but silent on the network"
# looks identical to "idle" from Render's side. http_server.py's
# _heartbeat_loop works around this by having the worker GET its own
# /health endpoint every WORKER_HEARTBEAT_INTERVAL_SECONDS while at least
# one job thread is actively processing - genuine inbound traffic, which is
# what actually resets Render's idle clock.
#
# This is deliberately separate from db.py's STALE_JOB_THRESHOLD reclaim
# logic, not a replacement for it: that recovers a job AFTER Render has
# already killed the container (another worker eventually reclaims the
# orphaned 'running' row); this is meant to stop that kill from happening
# in the first place for a job that's still legitimately in progress. Keep
# both - the reclaim logic remains the safety net for the cases a
# heartbeat can't prevent (the container getting killed for reasons other
# than idle spin-down, a heartbeat ping itself failing, etc).
#
# Must be set to this SAME worker service's own public HTTPS URL (i.e. the
# same value as the Node backend's WORKER_SERVICE_URL) - left blank by
# default so a deploy that hasn't set it fails safe (heartbeat disabled,
# logged once) rather than guessing a URL and pinging the wrong thing.
WORKER_PUBLIC_URL = os.environ.get("WORKER_PUBLIC_URL", "").strip().rstrip("/")
# 2 minutes, per the "worker sleeps and the job gets stuck in running"
# symptom this was built for - comfortably inside Render's ~15 minute idle
# window even accounting for a slow/retried ping.
WORKER_HEARTBEAT_INTERVAL_SECONDS = int(
    os.environ.get("WORKER_HEARTBEAT_INTERVAL_SECONDS", "120")
)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required")


def _resolve_db_ca_cert_path():
    """Mirrors src/db/pool.js's SSL resolution so the Node backend and this
    worker verify the same CA the same way. When DATABASE_URL points to
    localhost/127.0.0.1, SSL is disabled since local Postgres typically has
    no SSL enabled.
    """
    if "localhost" in DATABASE_URL or "127.0.0.1" in DATABASE_URL:
        return None

    inline_cert = os.environ.get("DB_CA_CERT", "").strip()
    if inline_cert:
        # See pool.js's identical normalization for why: stray \r from
        # Windows-edited .env files corrupts PEM parsing in a way that's
        # easy to miss by eye but breaks cert verification.
        normalized_cert = inline_cert.replace("\r\n", "\n")
        # libpq's sslrootcert takes a file path, not raw PEM content, so
        # write it out once at process startup.
        fd, tmp_path = tempfile.mkstemp(prefix="paperflow-db-ca-", suffix=".pem")
        with os.fdopen(fd, "w") as handle:
            handle.write(normalized_cert)
        return tmp_path

    configured_path = os.environ.get("DB_CA_CERT_PATH", "").strip()
    resolved = (BACKEND_ROOT / (configured_path or "certs/ca.pem")).resolve()

    if resolved.exists():
        return str(resolved)

    if configured_path:
        # Explicitly configured but missing - fail loudly rather than
        # silently falling back to an unverified connection.
        raise RuntimeError(
            f'DB_CA_CERT_PATH is set to "{resolved}" but that file does not exist'
        )

    return None


# None when no CA is configured (e.g. local Postgres without SSL) - db.py
# only adds sslmode=verify-full when this is set.
DB_CA_CERT_PATH = _resolve_db_ca_cert_path()
