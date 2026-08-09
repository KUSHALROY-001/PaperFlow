"""
Standalone diagnostic - NOT part of the app pipeline.

Run this directly on the Windows machine that runs the worker:

    cd backend
    python -m worker.diagnose_connection

It sends a small request, then a request padded to roughly the same size
as a real 2-page vision chunk, straight to the Gemini endpoint with plain
urllib (same library the worker uses). This isolates whether WinError
10053 is a payload-size/connection-stability issue independent of any
worker code, or something specific to how the worker builds its request.
"""

import base64
import json
import os
import time
from urllib import request, error

from .config import AI_MODEL, AI_TIMEOUT_SECONDS, GEMINI_API_KEY

URL = f"https://generativelanguage.googleapis.com/v1beta/models/{AI_MODEL or 'gemini-flash-latest'}:generateContent"


def send(payload_bytes_size_label, extra_text_chars):
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": "Reply with the single word OK." + ("x" * extra_text_chars)},
                ],
            }
        ]
    }
    body = json.dumps(payload).encode("utf-8")
    print(f"--- Sending {payload_bytes_size_label} ({len(body) / 1024:.0f} KB) ---")

    req = request.Request(
        URL,
        data=body,
        headers={"x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"},
        method="POST",
    )

    start = time.time()
    try:
        with request.urlopen(req, timeout=AI_TIMEOUT_SECONDS) as response:
            data = response.read()
        elapsed = time.time() - start
        print(f"OK in {elapsed:.1f}s, response size {len(data)} bytes")
        return True
    except error.HTTPError as e:
        elapsed = time.time() - start
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        print(f"FAILED after {elapsed:.1f}s: HTTP {e.code} {e.reason}")
        if body:
            print(f"Response body:\n{body}")
        return False
    except error.URLError as e:
        elapsed = time.time() - start
        print(f"FAILED after {elapsed:.1f}s: {e}")
        return False
    except Exception as e:
        elapsed = time.time() - start
        print(f"FAILED after {elapsed:.1f}s: {type(e).__name__}: {e}")
        return False


if __name__ == "__main__":
    if not GEMINI_API_KEY:
        raise SystemExit("GEMINI_API_KEY not set - check backend/.env")

    print(f"Model: {AI_MODEL or 'gemini-flash-latest'}")
    print(f"Timeout: {AI_TIMEOUT_SECONDS}s\n")

    # Small request - should basically always succeed if the key/network is fine at all.
    small_ok = send("tiny request", extra_text_chars=0)

    print()

    # ~2-3MB of padding, roughly what two base64-encoded page JPEGs add up to.
    # Isolates whether size specifically (not just "any" request) triggers the reset.
    large_ok = send("~3MB padded request", extra_text_chars=3_000_000)

    print("\n--- Summary ---")
    print(f"Small request: {'OK' if small_ok else 'FAILED'}")
    print(f"Large request: {'OK' if large_ok else 'FAILED'}")

    if small_ok and not large_ok:
        print(
            "\nLarge payloads are the trigger - points to an unstable "
            "connection/upload path, not the API key or Gemini itself. "
            "Reducing AI_PDF_PAGES_PER_CHUNK and/or AI_PDF_RENDER_SCALE, "
            "and adding sturdier retry/backoff, should help."
        )
    elif not small_ok:
        print(
            "\nEven the tiny request failed - this points to something more "
            "basic (DNS, firewall, ISP-level block, or the API key/network "
            "path itself), not payload size."
        )
    else:
        print("\nBoth succeeded here - the earlier failure may have been transient.")