import base64
import json
import time
from urllib import request

import fitz

from ..config import (
    AI_MODEL,
    AI_PDF_PAGES_PER_CHUNK,
    AI_PDF_RENDER_SCALE,
    AI_TIMEOUT_SECONDS,
    GEMINI_API_KEY,
)
from .schemas import GEMINI_QUESTION_RESPONSE_SCHEMA

QUESTION_GENERATION_CONFIG = {
    "responseMimeType": "application/json",
    # Constrains generation at the token level instead of only asking for
    # JSON in the prompt - this is what actually closed the single-quoted
    # "Expecting property name enclosed in double quotes" failures we saw
    # from smaller/less strictly-instruction-following models.
    "responseSchema": GEMINI_QUESTION_RESPONSE_SCHEMA,
}


class GeminiProvider:
    name = "gemini"

    def __init__(self):
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is required when AI_PROVIDER=gemini")
        self.model = AI_MODEL or "gemini-flash-latest"

    def generate_json(self, system_prompt, user_prompt):
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": f"{system_prompt}\n\n{user_prompt}"},
                    ],
                }
            ],
            "generationConfig": QUESTION_GENERATION_CONFIG,
        }

        req = request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-goog-api-key": GEMINI_API_KEY,
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with request.urlopen(req, timeout=AI_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))

        parts = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [])
        )
        return "\n".join(part.get("text", "") for part in parts).strip()

    def generate_json_from_pdf(self, system_prompt, user_prompt, pdf_path):
        pdf_bytes = pdf_path.read_bytes()
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": f"{system_prompt}\n\n{user_prompt}"},
                        {
                            "inline_data": {
                                "mime_type": "application/pdf",
                                "data": base64.b64encode(pdf_bytes).decode("ascii"),
                            }
                        },
                    ],
                }
            ],
            "generationConfig": QUESTION_GENERATION_CONFIG,
        }

        req = request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-goog-api-key": GEMINI_API_KEY,
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with request.urlopen(req, timeout=AI_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))

        parts = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [])
        )
        return "\n".join(part.get("text", "") for part in parts).strip()

    def generate_json_from_pdf_images(self, system_prompt, user_prompt, pdf_path, on_progress=None):
        # Returns one result dict PER CHUNK, always - success or failure -
        # each carrying its TRUE physical page range. This used to return
        # (responses, chunk_errors), where `responses` only contained
        # successful chunks appended in order with no page range attached.
        # That meant a failed chunk wasn't just missing - it silently
        # shifted every LATER chunk's position in the list, so the caller's
        # `enumerate(response_texts, start=1)` mislabeled which physical
        # pages a given parse failure actually came from (confirmed on a
        # real job: "pdf_images_parse_6" was actually pages 15-16, not
        # 11-12, because two earlier chunks had failed and silently closed
        # the gap). Labeling every result unconditionally with its real
        # start_page/end_page removes that entire class of mislabeling.
        #
        # Each chunk also gets one retry (2 attempts total) before being
        # recorded as failed. This targets the two failure modes actually
        # observed: a slow/timed-out response (dense pages can legitimately
        # exceed AI_TIMEOUT_SECONDS under schema-constrained generation) and
        # a truncated/invalid JSON response (the model hit an output-length
        # ceiling mid-string). Both are plausibly transient - a retry is
        # cheap insurance before giving up on a chunk's pages entirely.
        results = []

        with fitz.open(pdf_path) as document:
            chunk_starts = list(range(0, document.page_count, AI_PDF_PAGES_PER_CHUNK))
            total_chunks = len(chunk_starts)

            for chunk_number, start_index in enumerate(chunk_starts, start=1):
                start_page = start_index + 1
                end_index = min(start_index + AI_PDF_PAGES_PER_CHUNK, document.page_count)
                end_page = end_index

                response_text = None
                error = None

                for attempt in range(2):
                    try:
                        page_parts = []
                        for page_index in range(start_index, end_index):
                            page = document[page_index]
                            pixmap = page.get_pixmap(
                                matrix=fitz.Matrix(AI_PDF_RENDER_SCALE, AI_PDF_RENDER_SCALE),
                                alpha=False,
                            )
                            page_parts.append(
                                {
                                    "inline_data": {
                                        "mime_type": "image/jpeg",
                                        "data": base64.b64encode(pixmap.tobytes("jpeg")).decode("ascii"),
                                    }
                                }
                            )

                        prompt = (
                            f"{system_prompt}\n\n{user_prompt}\n\n"
                            f"Attached images are PDF pages {start_page} to {end_page}. "
                            "Use these page numbers for source_page."
                        )
                        response_text = self._generate_from_parts([{"text": prompt}, *page_parts])
                        if response_text:
                            error = None
                            break
                        error = "AI response was empty"
                    except Exception as e:
                        error = str(e)

                    # Only sleep before an actual retry (not after the last
                    # attempt, and not at all if this attempt succeeded).
                    # Matters most for "AI response was empty" - unlike a
                    # timeout, that can fail fast with no natural delay, so
                    # retrying instantly risks landing in the exact same
                    # per-minute rate-limit window that likely caused it.
                    if error and attempt == 0:
                        time.sleep(4)
                    # Falls through to a second attempt only if this one
                    # failed or came back empty - a genuinely successful
                    # response breaks out above and skips the retry.

                results.append(
                    {
                        "chunk_number": chunk_number,
                        "start_page": start_page,
                        "end_page": end_page,
                        "response_text": response_text,
                        "error": error,
                    }
                )

                # This call can legitimately take a while per chunk with no
                # other signal of life - a job silently sitting at "AI
                # cleanup" for 20+ minutes with zero DB updates is exactly
                # what made a genuinely-orphaned job indistinguishable from
                # a genuinely-slow one in a real incident. Report after each
                # chunk so the caller can checkpoint real progress instead.
                if on_progress:
                    on_progress(chunk_number, total_chunks)

        return results

    def _generate_from_parts(self, parts):
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": parts,
                }
            ],
            "generationConfig": QUESTION_GENERATION_CONFIG,
        }

        req = request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-goog-api-key": GEMINI_API_KEY,
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with request.urlopen(req, timeout=AI_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))

        parts = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [])
        )
        return "\n".join(part.get("text", "") for part in parts).strip()