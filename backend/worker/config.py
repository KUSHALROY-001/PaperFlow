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
AI_PROVIDER = os.environ.get("AI_PROVIDER", "disabled").strip().lower()
AI_MODEL = os.environ.get("AI_MODEL", "").strip()
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
AI_MAX_CHARS_PER_CHUNK = int(os.environ.get("AI_MAX_CHARS_PER_CHUNK", "12000"))
AI_TIMEOUT_SECONDS = int(os.environ.get("AI_TIMEOUT_SECONDS", "90"))
AI_PDF_PAGES_PER_CHUNK = int(os.environ.get("AI_PDF_PAGES_PER_CHUNK", "3"))
AI_PDF_RENDER_SCALE = float(os.environ.get("AI_PDF_RENDER_SCALE", "1.5"))
AI_GENERATE_FROM_NOTES = os.environ.get("AI_GENERATE_FROM_NOTES", "true").strip().lower() not in (
    "0",
    "false",
    "no",
    "off",
)
AI_NOTES_QUESTIONS_PER_CHUNK = int(os.environ.get("AI_NOTES_QUESTIONS_PER_CHUNK", "8"))
AI_NOTES_MAX_QUESTIONS = int(os.environ.get("AI_NOTES_MAX_QUESTIONS", "100"))
# Gemini's free tier is 15 requests/minute, 500/day (as of writing) - this
# defaults to the free-tier RPM ceiling so a fresh setup is safe out of the
# box, but is meant to be raised via env var on a paid tier where the real
# ceiling is much higher. See gemini_provider.py's rate limiter - this is
# enforced proactively (before a call, not just retried after a 429).
AI_MAX_REQUESTS_PER_MINUTE = int(os.environ.get("AI_MAX_REQUESTS_PER_MINUTE", "15"))
# A generated question flagged as a near-duplicate of something already in
# the workspace (similarity_score from question_duplicate_pairs) at or
# above this gets ONE automatic regeneration attempt rather than just
# sitting in the review queue - see
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