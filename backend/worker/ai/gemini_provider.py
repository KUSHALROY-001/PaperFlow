import base64
import collections
import json
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from urllib import request
from urllib.error import HTTPError, URLError

import fitz

from ..config import (
    AI_MAX_REQUESTS_PER_MINUTE,
    AI_MODEL,
    AI_PDF_PAGES_PER_CHUNK,
    AI_PDF_RENDER_SCALE,
    AI_TIMEOUT_SECONDS,
    AI_VISION_CHUNK_CONCURRENCY,
    GEMINI_API_KEY,
)
from .schemas import (
    GEMINI_GRADING_RESPONSE_SCHEMA,
    GEMINI_QUESTION_RESPONSE_SCHEMA,
    GEMINI_TEMPLATE_RESPONSE_SCHEMA,
)

QUESTION_GENERATION_CONFIG = {
    "responseMimeType": "application/json",
    # Constrains generation at the token level instead of only asking for
    # JSON in the prompt - this is what actually closed the single-quoted
    # "Expecting property name enclosed in double quotes" failures we saw
    # from smaller/less strictly-instruction-following models.
    "responseSchema": GEMINI_QUESTION_RESPONSE_SCHEMA,
}

# Own dedicated generationConfig - generate_json below is hardwired to
# QUESTION_GENERATION_CONFIG's question-list schema, which would force a
# template-generation response into the wrong shape entirely, so that
# request goes through its own method with its own schema instead.
TEMPLATE_GENERATION_CONFIG = {
    "responseMimeType": "application/json",
    "responseSchema": GEMINI_TEMPLATE_RESPONSE_SCHEMA,
}

GRADING_GENERATION_CONFIG = {
    "responseMimeType": "application/json",
    "responseSchema": GEMINI_GRADING_RESPONSE_SCHEMA,
}

# Step 1 of generate_template_json's two-call flow (see that method's own
# comment for why this can't just be one call with both search and a
# schema attached). Deliberately NOT asking for the final JSON shape here
# - a plain-text research summary the model is free to write however it
# needs to is more reliable to extract from a grounded response than
# fighting the model to hand-write valid JSON without any schema
# enforcement backing it. Step 2 (the existing schema-constrained call)
# does the actual JSON formatting, working from this summary.
TEMPLATE_RESEARCH_SYSTEM_PROMPT = """
You are researching real exam formats using Google Search. Given an exam
name, search for and report its CURRENT, most recently published official
pattern - prefer the latest available year's official notification,
syllabus PDF, or exam-conducting-body announcement over older sources,
forum posts, or your own general knowledge, since exam patterns (section
structure, question counts, marking scheme, duration) genuinely change
from year to year and an outdated pattern is actively misleading here.

Report what you find in plain text, covering: the exam's full name, a
short description, its category and typical difficulty, total question
count, duration, marks per correct answer, negative marking (if any -
many exams changed this in recent years, so check specifically), and a
section-by-section breakdown (name, topics typically covered, and any
section-specific question count or marking that differs from the overall
scheme). Mention which year/cycle your sources are from where you can
tell, and flag plainly if the pattern seems to have changed recently or if
you're not confident about a specific number. If you can't find anything
specific for this exam, say so plainly rather than inventing details.
""".strip()


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
                # Hold the lock while sleeping so concurrent job threads
                # and vision-chunk threads cannot all wake, re-check, and
                # burst past capacity. Other waiters block on the lock;
                # only this thread claims the next freed slot.
                time.sleep(sleep_for)
            # Loop back around to re-trim and re-check rather than assuming
            # capacity freed up - a generous sleep_for rounding error
            # shouldn't be able to let this through early.


_DAILY_QUOTA_MARKERS = ("perday", "requestsperday")


def _parse_gemini_http_error(http_error):
    """
    Reads an HTTPError's response body for Gemini's own error message text
    (works for any status, not just 429 - see the two call sites below).
    For a 429 specifically, also pulls out enough to tell a per-minute
    rate limit apart from a per-day quota exhaustion, and Gemini's own
    suggested retryDelay when it gives one (far more accurate than a
    blind guess, since Gemini knows exactly when its own window resets).

    Gemini's 429 body looks like:
      {"error": {"code": 429, "status": "RESOURCE_EXHAUSTED", "details": [
        {"@type": ".../QuotaFailure", "violations": [{"quotaId":
          "GenerateRequestsPerDayPerProjectPerModel-FreeTier", ...}]},
        {"@type": ".../RetryInfo", "retryDelay": "23s"}
      ]}}
    A non-429 error body (e.g. a bad model name) typically has no
    "details" at all, just a top-level "message" - e.g. Gemini's actual
    text for an unrecognized AI_MODEL value is literally
    "models/<value> is not found for API version v1beta, or is not
    supported for that method." - is_daily/retry_delay_seconds simply
    stay at their defaults (False/None) for these, which is correct:
    neither concept applies outside a 429.

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


def _call_with_retry(make_request, model_name):
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
      Unauthorized, or 404 - most often an AI_MODEL value Gemini doesn't
      recognize, see config.py's _normalize_ai_model) is NOT retried -
      retrying a malformed request or a bad model name would just fail
      identically every time. Re-raised as a RuntimeError with Gemini's
      own message text and the model name that produced it, rather than
      letting the raw HTTPError (whose default str() is a content-free
      "HTTP Error 404: Not Found") propagate untouched - that bare
      message reaches both worker.py#friendly_job_error_message (which
      trusts a RuntimeError's own text verbatim) and
      http_server.py's generic exception handler, and gave no indication
      at all of which model name was actually wrong when this branch
      still just re-raised the original HTTPError as-is.
    """
    max_attempts = 3
    for attempt in range(max_attempts):
        _wait_for_rate_limit_capacity()
        try:
            return make_request()
        except HTTPError as e:
            if e.code != 429:
                if e.code < 500 or attempt == max_attempts - 1:
                    _, _, message = _parse_gemini_http_error(e)
                    raise RuntimeError(
                        f"Gemini API error for model {model_name!r}: "
                        f"HTTP {e.code} - {message}"
                    ) from e
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

    def _generate_with_config(self, system_prompt, user_prompt, generation_config):
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
                "generationConfig": generation_config,
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

        return _call_with_retry(make_request, self.model)

    def generate_json(self, system_prompt, user_prompt):
        return self._generate_with_config(
            system_prompt, user_prompt, QUESTION_GENERATION_CONFIG
        )

    def generate_grading_json(self, system_prompt, user_prompt):
        return self._generate_with_config(
            system_prompt, user_prompt, GRADING_GENERATION_CONFIG
        )

    # Same call shape as _generate_with_config above, minus generationConfig
    # entirely and with the google_search tool attached instead. Kept as
    # its own method rather than a parameter on _generate_with_config
    # because the two are not just "config A vs config B" - a schema'd
    # generationConfig and this tool are mutually exclusive on Gemini's
    # API (confirmed: attaching both returns 400 "Tool use with a response
    # mime type: 'application/json' is unsupported"), so there's no
    # request shape where both would ever apply together.
    def _generate_grounded_text(self, system_prompt, user_prompt):
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
                "tools": [{"google_search": {}}],
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

        return _call_with_retry(make_request, self.model)

    def generate_template_json(self, system_prompt, user_prompt):
        # Two calls, not one - see TEMPLATE_RESEARCH_SYSTEM_PROMPT's own
        # comment and _generate_grounded_text's above for why Gemini
        # specifically can't combine search grounding with the
        # schema-constrained call in a single request the way OpenAI's
        # Responses API can (openai_provider.py's generate_template_json
        # stays single-call). Step 1 grounds the model in the exam's
        # actual CURRENT pattern via a live search (plain text, no
        # schema); step 2 is the original schema-constrained call,
        # working from those findings instead of - or in addition to -
        # whatever the model already "knows" from training, which is
        # exactly what was producing outdated exam patterns before this.
        try:
            research = self._generate_grounded_text(
                TEMPLATE_RESEARCH_SYSTEM_PROMPT, user_prompt
            )
        except Exception as error:
            # Search grounding is a quality improvement, not a hard
            # dependency for this feature to function at all - if it
            # fails for any reason (quota, transient network error, a
            # model that doesn't support the tool), fall back to a
            # single ungrounded call rather than failing template
            # generation entirely. Logged (not just swallowed) because a
            # silent failure here is indistinguishable from grounding
            # working but finding nothing - and it's exactly the kind of
            # thing that produces a stale, training-data-only template
            # with no visible error anywhere.
            print(
                f"[gemini_provider] template grounding search failed for "
                f"{user_prompt!r}: {error!r} - falling back to ungrounded generation"
            )
            research = None

        structuring_prompt = user_prompt
        if research and research.strip():
            print(
                f"[gemini_provider] template grounding research for "
                f"{user_prompt!r}: {research.strip()[:500]!r}"
            )
            structuring_prompt = (
                f"{user_prompt}\n\n"
                "Live web search findings on this exam's CURRENT pattern "
                "(prefer these over your own training knowledge wherever "
                "they differ - your training data may predate a pattern "
                "change):\n"
                f"{research.strip()}"
            )
        else:
            print(
                f"[gemini_provider] template grounding returned no usable "
                f"research for {user_prompt!r} - structuring call will rely "
                f"on the model's own training knowledge"
            )

        return self._generate_with_config(
            system_prompt, structuring_prompt, TEMPLATE_GENERATION_CONFIG
        )

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

        return _call_with_retry(make_request, self.model)

    def generate_json_from_pdf_images(
        self,
        system_prompt,
        user_prompt,
        pdf_path,
        page_numbers=None,
        on_progress=None,
        on_result=None,
    ):
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
        # Each chunk also gets retries (3 attempts total) before being
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
        #
        # Vision chunks run concurrently (AI_VISION_CHUNK_CONCURRENCY) so
        # wall-clock time is batches of in-flight Gemini calls, not N
        # sequential round-trips. Merge order is still PAGE order: we
        # collect via ThreadPoolExecutor.map(), which yields in submission
        # order. provider.py's _put_extracted_question(..., prefer_new=True)
        # means "later PAGE chunk wins on a split question", not "whichever
        # HTTP response arrived last". as_completed() would break that.
        #
        # PyMuPDF is not thread-safe per document handle, so rendering is
        # sequential (phase 1) and only the network+retry work is pooled
        # (phase 2). Rendering is local CPU; the bottleneck is Gemini.
        #
        # Cancellation (job_cancelled_event below) now stops within roughly
        # one BATCH of AI_VISION_CHUNK_CONCURRENCY chunks, not one chunk -
        # chunks already mid-flight when the job is cancelled can't be
        # interrupted (no cancel hook on the underlying HTTP call), but
        # every chunk that hasn't started yet skips instead of running.

        daily_quota_event = threading.Event()
        daily_quota_message_holder = {"message": None}
        # Set the moment ANY chunk's on_progress call detects the job was
        # cancelled (report_ai_progress -> check_not_cancelled raises
        # JobCancelled, a BaseException, straight through report()'s
        # `except Exception: pass`). Checked at the top of every chunk -
        # same pattern as daily_quota_event - so a chunk that hasn't
        # started yet skips its Gemini call entirely instead of running it
        # only to discover afterward the job was already cancelled.
        job_cancelled_event = threading.Event()
        progress_lock = threading.Lock()
        progress_state = {"completed": 0}

        chunk_jobs = []
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

                # Populated here, before any API call - {page_number:
                # {"png_bytes": ..., "width": ..., "height": ...}}. This is
                # the SAME pixmap already rendered for the API call,
                # just re-encoded as PNG - not a fresh render - so
                # diagram bounding boxes the model reports line up
                # with these exact pixel dimensions (see asset_extractor.py).
                page_parts = []
                page_images = {}
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
                    page_images[page_number] = {
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
                chunk_jobs.append(
                    {
                        "chunk_number": chunk_number,
                        "start_page": start_page,
                        "end_page": end_page,
                        "prompt": prompt,
                        "page_parts": page_parts,
                        "page_images": page_images,
                    }
                )

        def _process_chunk(job):
            chunk_number = job["chunk_number"]
            start_page = job["start_page"]
            end_page = job["end_page"]

            # Once one chunk hits the DAILY quota (as opposed to the
            # per-minute one - see _parse_gemini_http_error), every
            # remaining / in-flight chunk would fail identically: the day's
            # quota doesn't reset mid-job the way a per-minute window does,
            # so there's no reason to spend the next N chunks each doing
            # their own 3-attempt retry cycle only to hit the same wall N
            # times over. Still returns one result per remaining chunk with
            # a clear "skipped" error rather than just stopping short - see
            # the "one result dict PER CHUNK, always" contract above.
            if job_cancelled_event.is_set():
                response_text = None
                error = "Skipped - job cancelled"
                page_images_out = {}
            elif daily_quota_event.is_set():
                response_text = None
                error = f"Skipped - {daily_quota_message_holder['message']}"
                page_images_out = {}
            else:
                response_text = None
                error = None
                page_images_out = {}

                # 3 attempts with exponential backoff (4s, then 8s) rather
                # than a single flat retry. A connection reset on a large
                # image upload (WSAECONNABORTED / WinError 10053 on
                # Windows) is a real, if uncommon, transient failure mode
                # for multi-MB POST bodies - confirmed reproducible-but-rare
                # via a direct GeminiProvider call outside any job context.
                #
                # A 429 gets its own branch below rather than falling into
                # the generic Exception catch-all: Gemini's own retryDelay
                # (when given) is a far better sleep duration than blindly
                # guessing 4s/8s, and a daily-quota 429 shouldn't be
                # retried with backoff at all.
                max_attempts = 3
                for attempt in range(max_attempts):
                    if job_cancelled_event.is_set():
                        error = "Skipped - job cancelled"
                        break
                    if daily_quota_event.is_set():
                        error = f"Skipped - {daily_quota_message_holder['message']}"
                        break

                    _wait_for_rate_limit_capacity()
                    custom_sleep_seconds = None
                    try:
                        response_text = self._generate_from_parts(
                            [{"text": job["prompt"]}, *job["page_parts"]]
                        )
                        if response_text:
                            error = None
                            page_images_out = job["page_images"]
                            break
                        error = "AI response was empty"
                    except HTTPError as e:
                        if e.code != 429:
                            # e.reason is only the generic HTTP reason
                            # phrase ("Not Found") - Gemini's actual
                            # explanation (e.g. "models/<x> is not found
                            # for API version v1beta, or is not supported
                            # for that method") lives in the response
                            # body, which _parse_gemini_http_error reads
                            # regardless of status code (see its own
                            # docstring). Without this, a bad AI_MODEL
                            # value surfaced as the content-free
                            # "[http 404] Not Found" with no hint of which
                            # model name was actually wrong.
                            _, _, message = _parse_gemini_http_error(e)
                            error = f"[http {e.code}] {message}"
                        else:
                            is_daily, retry_delay_seconds, message = _parse_gemini_http_error(e)
                            if is_daily:
                                error = f"Gemini daily quota exhausted: {message}"
                                daily_quota_message_holder["message"] = error
                                daily_quota_event.set()
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

            result = {
                "chunk_number": chunk_number,
                "start_page": start_page,
                "end_page": end_page,
                "response_text": response_text,
                "error": error,
                "page_images": page_images_out,
            }
            # The request body can be several megabytes. The result keeps
            # only the PNG data needed for this chunk's diagram crops, so
            # release the base64/JPEG request payload as soon as Gemini has
            # answered instead of retaining every page until the last call.
            job["page_parts"] = []
            job["prompt"] = ""

            # Completed-count, not chunk_number: chunks finish out of page
            # order, so reporting chunk_number would make the UI jump
            # backward (vision 3/10 then 1/10). The counter is monotonic.
            with progress_lock:
                progress_state["completed"] += 1
                completed = progress_state["completed"]
            if on_progress:
                try:
                    on_progress(completed, total_chunks)
                except BaseException:
                    # JobCancelled is deliberately a BaseException (see
                    # worker.py#check_not_cancelled) so it survives
                    # report()'s `except Exception: pass`. Flip the shared
                    # flag BEFORE re-raising so every other thread - ones
                    # already running and ones still queued - skips its
                    # own Gemini call instead of only finding out after
                    # wastefully making one. Re-raise unchanged so this
                    # chunk's own future still carries the real exception
                    # for list(executor.map(...)) to surface.
                    job_cancelled_event.set()
                    raise

            return result

        if not chunk_jobs:
            return []

        # Not a `with` block, deliberately: the default context-manager
        # exit calls shutdown(wait=True) with cancel_futures=False, which
        # BLOCKS until every already-queued chunk finishes running - even
        # ones that hadn't started yet when JobCancelled fired - before
        # the exception is allowed to keep propagating. cancel_futures=True
        # (3.9+) drops anything still queued instead of running it, so
        # cancellation only ever waits on chunks already mid-flight
        # (at most AI_VISION_CHUNK_CONCURRENCY of them), not all of them.
        executor = ThreadPoolExecutor(max_workers=max(1, AI_VISION_CHUNK_CONCURRENCY))
        try:
            # .map(), deliberately NOT as_completed(): .map() yields
            # results in SUBMISSION order (chunk_number / page order),
            # regardless of which thread's request actually finishes first.
            results = []
            # executor.map yields in page order. Deliver each completed
            # result before waiting for later pages, so the worker can merge
            # and publish it while the remaining vision requests continue.
            for result in executor.map(_process_chunk, chunk_jobs):
                if on_result:
                    on_result(result)
                    # Streaming consumers have already parsed, cropped, and
                    # persisted this page range. Do not retain its full-page
                    # PNGs in the results list until every later chunk ends.
                    result["page_images"].clear()
                    result["response_text"] = None
                results.append(result)
        finally:
            executor.shutdown(wait=True, cancel_futures=True)

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
