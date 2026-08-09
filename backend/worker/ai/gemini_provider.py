import base64
import json
import time
from urllib import request
from urllib.error import URLError

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


def _group_pages_into_chunks(page_numbers, chunk_size):
    """
    Groups a sorted list of 1-indexed page numbers into chunks of at most
    chunk_size pages each, keeping physically-adjacent pages together in
    the same chunk rather than just slicing the list positionally. This
    matters for a sparse, non-contiguous page set (e.g. pages [2, 3, 9, 10,
    11] flagged needs_vision out of a 20-page doc): a naive positional
    slice of size 2 would group [2,3] then [9,10] then [11] - which is
    actually what we want here since 2-3 and 9-10 ARE each contiguous - but
    for [2, 5, 9] (all isolated single pages) a naive [2,5] grouping would
    describe a fabricated "pages 2 to 5" to the model that skips page
    3-4 entirely, which is misleading in both the prompt and any resulting
    error label. Grouping by physical adjacency first avoids that.
    """
    if not page_numbers:
        return []

    runs = []
    current_run = [page_numbers[0]]
    for page in page_numbers[1:]:
        if page == current_run[-1] + 1:
            current_run.append(page)
        else:
            runs.append(current_run)
            current_run = [page]
    runs.append(current_run)

    chunks = []
    for run in runs:
        for start in range(0, len(run), chunk_size):
            chunks.append(run[start : start + chunk_size])

    return chunks


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

    def generate_json_from_pdf_images(self, system_prompt, user_prompt, pdf_path, page_numbers=None, on_progress=None):
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
        #
        # page_numbers (1-indexed, matching pdf_extract.py's page dicts) lets
        # a caller send only the specific pages that actually need vision
        # (see provider.py's per-page routing, driven by
        # pdf_extract.classify_page_content) instead of always paying for
        # every page in the document. Defaults to "every page" so a fully
        # scanned document (where every page needs vision anyway) doesn't
        # have to change how it calls this.
        results = []

        with fitz.open(pdf_path) as document:
            if page_numbers is None:
                selected_pages = list(range(1, document.page_count + 1))
            else:
                selected_pages = sorted(p for p in set(page_numbers) if 1 <= p <= document.page_count)

            page_chunks = _group_pages_into_chunks(selected_pages, AI_PDF_PAGES_PER_CHUNK)
            total_chunks = len(page_chunks)

            for chunk_number, chunk_pages in enumerate(page_chunks, start=1):
                start_page = chunk_pages[0]
                end_page = chunk_pages[-1]

                response_text = None
                error = None
                # Populated only on a successful attempt - {page_number:
                # {"png_bytes": ..., "width": ..., "height": ...}}. This is
                # the SAME pixmap already rendered for the API call above,
                # just re-encoded as PNG - not a fresh render - so a
                # diagram_bbox the model reports is guaranteed to line up
                # with these exact pixel dimensions (see asset_extractor.py).
                # Kept only long enough for the caller to crop any reported
                # diagrams right after processing this chunk's response,
                # then discarded - holding full-page PNGs for the whole job
                # would be wasteful.
                page_images = {}

                # 3 attempts with exponential backoff (4s, then 8s) rather
                # than a single flat retry. A connection reset on a large
                # image upload (WSAECONNABORTED / WinError 10053 on
                # Windows) is a real, if uncommon, transient failure mode
                # for multi-MB POST bodies - confirmed reproducible-but-rare
                # via a direct GeminiProvider call outside any job context.
                # One retry with no real backoff wasn't enough insurance
                # against it recurring across a real job's dozen-plus
                # sequential chunk calls.
                max_attempts = 3
                for attempt in range(max_attempts):
                    try:
                        page_parts = []
                        attempt_page_images = {}
                        for page_number in chunk_pages:
                            page = document[page_number - 1]
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
                            attempt_page_images[page_number] = {
                                "png_bytes": pixmap.tobytes("png"),
                                "width": pixmap.width,
                                "height": pixmap.height,
                            }

                        pages_description = (
                            f"{start_page} to {end_page}" if len(chunk_pages) > 1 else str(start_page)
                        )
                        prompt = (
                            f"{system_prompt}\n\n{user_prompt}\n\n"
                            f"Attached images are PDF pages {pages_description}, in order. "
                            "Use these page numbers for source_page."
                        )
                        response_text = self._generate_from_parts([{"text": prompt}, *page_parts])
                        if response_text:
                            error = None
                            page_images = attempt_page_images
                            break
                        error = "AI response was empty"
                    except URLError as e:
                        # urlopen() catches OSError internally (including
                        # ConnectionAbortedError/ConnectionResetError/
                        # BrokenPipeError - exactly what WinError 10053
                        # raises on a mid-upload connection abort) and
                        # RE-WRAPS it as URLError before it ever reaches
                        # this except block - see
                        # AbstractHTTPHandler.do_open in cpython's
                        # urllib/request.py ("except OSError as err: raise
                        # URLError(err)"). A bare
                        # "except (ConnectionResetError, ...)" clause here
                        # would therefore NEVER fire for this exact
                        # failure mode - it can only ever catch a socket
                        # exception raised outside urlopen's own
                        # try/except, which this code path doesn't have.
                        # The real underlying exception survives as
                        # e.reason, so unwrap it there instead.
                        if isinstance(e.reason, (ConnectionResetError, ConnectionAbortedError, BrokenPipeError)):
                            error = f"[network] connection aborted during upload: {e.reason}"
                        else:
                            error = f"[network] {e}"
                    except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError) as e:
                        # Defensive fallback only - kept in case a future
                        # code path here ever calls something socket-level
                        # directly instead of through urlopen (which would
                        # NOT wrap it in URLError). Not expected to fire
                        # today; see the URLError branch above for what
                        # actually catches a real WinError 10053.
                        error = f"[network] connection reset during upload: {e}"
                    except Exception as e:
                        error = str(e)

                    # Only sleep before an actual retry (not after the
                    # last attempt, and not at all if this attempt
                    # succeeded). Exponential, not flat - gives a
                    # rate-limit-adjacent cause more room to clear, and a
                    # one-off network blip more than one shot at not
                    # recurring.
                    if error and attempt < max_attempts - 1:
                        time.sleep(4 * (2**attempt))
                    # Falls through to the next attempt only if this one
                    # failed or came back empty - a genuinely successful
                    # response breaks out above and skips further retries.

                results.append(
                    {
                        "chunk_number": chunk_number,
                        "start_page": start_page,
                        "end_page": end_page,
                        "response_text": response_text,
                        "error": error,
                        "page_images": page_images,
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