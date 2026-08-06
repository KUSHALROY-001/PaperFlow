from pathlib import Path
from dotenv import load_dotenv
import os


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
