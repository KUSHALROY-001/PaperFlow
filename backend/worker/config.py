from pathlib import Path
from dotenv import load_dotenv
import os
import tempfile


BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL")
POLL_INTERVAL_SECONDS = int(os.environ.get("WORKER_POLL_INTERVAL_SECONDS", "5"))
MAX_JOBS_PER_RUN = int(os.environ.get("WORKER_MAX_JOBS_PER_RUN", "1"))
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
AI_NOTES_MAX_QUESTIONS = int(os.environ.get("AI_NOTES_MAX_QUESTIONS", "40"))
OCR_ENABLED = os.environ.get("OCR_ENABLED", "true").strip().lower() not in (
    "0",
    "false",
    "no",
    "off",
)
OCR_LANGUAGE = os.environ.get("OCR_LANGUAGE", "eng").strip()
OCR_RENDER_DPI = int(os.environ.get("OCR_RENDER_DPI", "220"))
TESSERACT_CMD = os.environ.get("TESSERACT_CMD", "").strip()

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