import base64
import collections
import json
import re
import threading
import time
from urllib import request
from urllib.error import HTTPError, URLError

import fitz

from ..config import (
    AI_MAX_REQUESTS_PER_MINUTE,
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


class GeminiDailyQuotaExceededError(RuntimeError):
    """
    Raised instead of a generic exception when Gemini's error response
    identifies the failure as the per-DAY quota (e.g. free tier's 500
    requests/day), not the per-minute one. Callers that loop over many
    batches (generate_questions_from_notes, generate_questions_from_metadata)
    catch this specifically to stop looping immediately rather than
    burning through every remaining batch's retry-with-backoff cycle only
    to hit the exact same wall each time - a per-day cap can't clear
    itself in the middle of a job the way a per-minute one can.
    """


# Shared across every GeminiProvider instance in this process, deliberately
# NOT an instance attribute - worker.py#process_job/process_generation_job
# calls get_provider() fresh for every single job (a new GeminiProvider()
# object each time), but Gemini enforces its per-minute quota against the
# API KEY, not against any particular Python object. Instance-level state
# would silently reset every job, meaning back-to-back jobs could each
# think they were starting from zero and burst well past the real
# 60-second ceiling right at the seam between them. Module-level state
# persists for as long as this worker process keeps running (`python -m
# worker.worker`, not `--once`), which is the only thing that actually
# matches how Gemini counts requests.
_recent_call_times = collections.deque()
_rate_limit_lock = threading.Lock()


def _wait_for_rate_limit_capacity():
    """
    Proactive pacing: blocks until making another call would keep this
    process at or under AI_MAX_REQUESTS_PER_MINUTE calls in the trailing 60
    seconds, sleeping first if we're already at capacity. This is what
    actually prevents 429s under a tight quota like the Gemini free tier's
    15 RPM - the retry-on-429 handling in _call_with_retry below is a
    safety net for when this still isn't enough (clock drift, another
    process sharing the same key), not the primary defense.
    """
    with _rate_limit_lock:
        while True:
            now = time.monotonic()
            window_start = now - 60
            while _recent_call_times and _recent_call_times[0] < window_start:
                _recent_call_times.popleft()

            if len(_recent_call_times) < AI_MAX_REQUESTS_PER_MINUTE:
                _recent_call_times.append(now)
                return

            sleep_for = _recent_call_times[0] + 60 - now
            if sleep_for > 0:
                # Released while sleeping would let concurrent callers pile
                # up past capacity - this worker is single-threaded per
                # process today (one job at a time, see worker.py's main
                # loop), so this only ever costs a wait, never a deadlock.
                time.sleep(sleep_for)
            # Loop back around to re-trim and re-check rather than assuming
            # capacity freed up - a generous sleep_for rounding error
            # shouldn't be able to let this through early.


_DAILY_QUOTA_MARKERS = ("perday", "requestsperday")


def _parse_gemini_http_error(http_error):
    """
    Reads a 429 response body to tell a per-minute rate limit apart from a
    per-day quota exhaustion, and to pull out Gemini's own suggested
    retryDelay when it gives one (far more accurate than a blind guess,
    since Gemini knows exactly when its own window resets).

    Gemini's 429 body looks like:
      {"error": {"code": 429, "status": "RESOURCE_EXHAUSTED", "details": [
        {"@type": ".../QuotaFailure", "violations": [{"quotaId":
          "GenerateRequestsPerDayPerProjectPerModel-FreeTier", ...}]},
        {"@type": ".../RetryInfo", "retryDelay": "23s"}
      ]}}
    quotaId distinguishes PerDay from PerMinute; retryDelay is a
    "<number>s" string. Either can be absent (a non-JSON body, or a 429
    from something other than Gemini's own quota enforcement, e.g. an
    upstream proxy) - this degrades to "unknown, per-minute-shaped,
    no known retry delay" rather than raising, since a parse failure here
    shouldn't crash the actual retry flow that called it.
    """
    is_daily = False
    retry_delay_seconds = None
    message = f"HTTP {http_error.code}: {http_error.reason}"

    try:
        body = json.loads(http_error.read().decode("utf-8"))
        error = body.get("error", {})
        message = error.get("message") or message
        for detail in error.get("details", []):
            quota_id = (detail.get("violations", [{}])[0].get("quotaId", "") or "").lower()
            if any(marker in quota_id.replace("_", "") for marker in _DAILY_QUOTA_MARKERS):
                is_daily = True
            raw_delay = detail.get("retryDelay")
            if raw_delay:
                match = re.match(r"([\d.]+)s?", raw_delay)
                if match:
                    retry_delay_seconds = float(match.group(1))
    except Exception:
        # Body already consumed by .read() above even on a parse failure -
        # nothing further to recover, fall through with the defaults set
        # before the try block.
        pass

    return is_daily, retry_delay_seconds, message


def _call_with_retry(make_request):
    """
    Wraps a single Gemini HTTP call (make_request: a zero-arg callable that
    performs the actual request.urlopen and returns the parsed response)
    with proactive pacing and retry for both quota errors and plain
    transient network failures.

    - Daily quota (RESOURCE_EXHAUSTED, PerDay in the quotaId): raised
      immediately as GeminiDailyQuotaExceededError, no retry - the quota
      can't come back mid-job, so retrying is pure wasted time.
    - Per-minute quota: retried up to 3 attempts total, sleeping for
      Gemini's own retryDelay when given, else a flat 20s (a bit over a
      third of the 60s window - enough for a freshly-exhausted minute to
      clear without just re-guessing the whole 60s blindly).
    - A non-429 HTTPError (5xx - Gemini's own server hiccupping, not
      rejecting the request) or a URLError (DNS failure, connection
      reset, or an SSL handshake that never completed - confirmed in a
      real job as "<urlopen error _ssl.c:1018: The handshake operation
      timed out>", which silently dropped a whole 8-question batch before
      this branch existed) is retried with the same exponential backoff
      (4s, 8s) generate_json_from_pdf_images already uses for identical
      failures - these are connection-level problems, not Gemini
      rejecting the request, so there's no useful "retry delay" to read
      from a response that was never received.
    - A non-429, non-5xx HTTPError (e.g. 400 Bad Request, 401
      Unauthorized) is NOT retried - retrying an authentication failure or
      a malformed request would just fail identically every time.
    """
    max_attempts = 3
    for attempt in range(max_attempts):
        _wait_for_rate_limit_capacity()
        try:
            return make_request()
        except HTTPError as e:
            if e.code != 429:
                if e.code < 500 or attempt == max_attempts - 1:
                    raise
                time.sleep(4 * (2**attempt))
                continue
            is_daily, retry_delay_seconds, message = _parse_gemini_http_error(e)
            if is_daily:
                raise GeminiDailyQuotaExceededError(message) from e
            if attempt == max_attempts - 1:
                raise RuntimeError(f"Gemini rate limit: {message}") from e
            time.sleep(retry_delay_seconds if retry_delay_seconds is not None else 20)
        except URLError as e:
            if attempt == max_attempts - 1:
                raise
            time.sleep(4 * (2**attempt))
    # Unreachable (the loop above always either returns or raises), but
    # keeps this function's control flow explicit rather than implicitly
    # falling off the end.
    raise RuntimeError("Gemini request failed after retries")


def _extract_text_or_diagnose(data):
    """
    Pulls the generated text out of a parsed Gemini generateContent
    response body. Same underlying extraction as before
    (candidates[0].content.parts), but now also looks at finishReason (and
    promptFeedback.blockReason) before deciding what to return, instead of
    just returning whatever text happened to be there - or nothing.

    Previously, a blocked or truncated response (content safety filter,
    RECITATION, or MAX_TOKENS - the last one a real risk here since
    QUESTION_GENERATION_CONFIG never sets maxOutputTokens or a
    thinkingConfig budget, so a dense image chunk can spend its entire
    token budget on internal "thinking" and leave nothing for the actual
    output) came back as either an empty string (already handled as "AI
    response was empty" by the caller) or, if `parts` existed but its text
    was just whitespace/near-empty, fell all the way through to
    extract_json_payload's json.loads(), which raised the generic
    "Expecting value: line 1 column 1 (char 0)" - a message that says
    nothing about WHY the model didn't return usable JSON. Confirmed on a
    real job: several image chunks failed this exact way on every one of
    their 3 retries, which only makes sense as a content-driven block or
    budget exhaustion, not the ordinary network flakiness the retry loop
    around this is actually built to recover from.

    Only raises when there's NOTHING to work with (empty text AND a
    non-STOP finish reason) - a finishReason like MAX_TOKENS that still
    left SOME text is left alone and returned as-is, since
    salvage_question_objects (schemas.py) can often recover whichever
    individual questions were fully written before the cutoff.
    """
    block_reason = (data.get("promptFeedback") or {}).get("blockReason")
    if block_reason:
        raise RuntimeError(f"Gemini blocked the prompt (blockReason={block_reason})")

    candidates = data.get("candidates") or [{}]
    candidate = candidates[0]
    finish_reason = candidate.get("finishReason")
    parts = candidate.get("content", {}).get("parts", [])
    text = "\n".join(part.get("text", "") for part in parts).strip()

    if not text and finish_reason and finish_reason != "STOP":
        flagged = [
            rating.get("category")
            for rating in candidate.get("safetyRatings") or []
            if rating.get("probability") not in (None, "NEGLIGIBLE", "LOW")
        ]
        detail = f"finishReason={finish_reason}"
        if flagged:
            detail += f", flagged categories={flagged}"
        raise RuntimeError(f"Gemini returned no usable content ({detail})")

    return text


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
        def make_request():
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

            return _extract_text_or_diagnose(data)

        return _call_with_retry(make_request)

    def generate_json_from_pdf(self, system_prompt, user_prompt, pdf_path):
        def make_request():
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

            return _extract_text_or_diagnose(data)

        return _call_with_retry(make_request)

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
        daily_quota_message = None

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

                # Once one chunk hits the DAILY quota (as opposed to the
                # per-minute one - see _parse_gemini_http_error), every
                # remaining chunk would fail identically: the day's quota
                # doesn't reset mid-job the way a per-minute window does,
                # so there's no reason to spend the next N chunks each
                # doing their own 3-attempt retry cycle only to hit the
                # same wall N times over. Still appends one result per
                # remaining chunk with a clear "skipped" error rather than
                # just stopping short - see the "one result dict PER
                # CHUNK, always" contract in the comment above this
                # method, which exists specifically so a caller's
                # enumerate() never has to guess which physical pages a
                # gap corresponds to.
                if daily_quota_message:
                    results.append(
                        {
                            "chunk_number": chunk_number,
                            "start_page": start_page,
                            "end_page": end_page,
                            "response_text": None,
                            "error": f"Skipped - {daily_quota_message}",
                            "page_images": {},
                        }
                    )
                    continue

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
                #
                # A 429 gets its own branch below rather than falling into
                # the generic Exception catch-all: Gemini's own retryDelay
                # (when given) is a far better sleep duration than blindly
                # guessing 4s/8s, and a daily-quota 429 shouldn't be
                # retried with backoff at all (see the daily_quota_message
                # check at the top of this loop).
                max_attempts = 3
                for attempt in range(max_attempts):
                    _wait_for_rate_limit_capacity()
                    custom_sleep_seconds = None
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
                    except HTTPError as e:
                        if e.code != 429:
                            error = f"[http {e.code}] {e.reason}"
                        else:
                            is_daily, retry_delay_seconds, message = _parse_gemini_http_error(e)
                            if is_daily:
                                error = f"Gemini daily quota exhausted: {message}"
                                daily_quota_message = error
                                break
                            error = f"[rate limit] {message}"
                            custom_sleep_seconds = (
                                retry_delay_seconds if retry_delay_seconds is not None else 20
                            )
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
                        #
                        # HTTPError is a URLError SUBCLASS, so it's caught
                        # above by the more specific except HTTPError
                        # clause first - this branch only ever sees a
                        # genuine non-HTTP network failure.
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
                    # succeeded, and not at all if we just hit a daily
                    # quota - that break above skips this entirely).
                    # custom_sleep_seconds (set by the 429 branch above)
                    # takes priority over the default exponential backoff
                    # when present - Gemini's own retryDelay is a better
                    # answer than a blind guess.
                    if error and attempt < max_attempts - 1:
                        time.sleep(
                            custom_sleep_seconds
                            if custom_sleep_seconds is not None
                            else 4 * (2**attempt)
                        )
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

        return _extract_text_or_diagnose(data)