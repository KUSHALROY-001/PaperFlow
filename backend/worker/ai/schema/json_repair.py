"""Recovers a usable JSON payload from a raw AI response - including a
truncated/malformed one. extract_json_payload is the entry point every
provider response is funneled through; salvage_question_objects is its
fallback for a response that got cut off mid-array. Split out of
schemas.py - see backend/worker/ARCHITECTURE.md.
"""

import json
import re

def _find_balanced_objects(text):
    """
    Scans text for every balanced {...} substring, at any nesting depth -
    not just ones that return all the way to depth 0. This matters because
    in a truncated response the OUTER wrapper (`{"questions": [...`) never
    closes, so gating on "back to depth 0" would mean the individual
    question objects nested inside it - which DO close correctly - never
    get recorded either. Correctly skips over braces that appear inside
    quoted strings.
    """
    objects = []
    open_positions = []
    in_string = False
    escape = False

    for index, char in enumerate(text):
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
            continue

        if char == "{":
            open_positions.append(index)
        elif char == "}":
            if open_positions:
                start = open_positions.pop()
                objects.append(text[start : index + 1])

    return objects


def salvage_question_objects(text):
    """
    Last-resort recovery for a response that broke partway through (e.g. an
    "Unterminated string" error from the model cutting off mid-generation).
    Rather than discarding the WHOLE chunk's worth of questions because one
    object near the end never finished, this pulls out every individually
    well-formed {...} object in the text and keeps whichever ones parse and
    look like a question (has "options" and either "text" or
    "question_text") - so a response that correctly wrote out 8 questions
    before breaking on the 9th still contributes those 8, instead of
    contributing nothing (which is what silently erased 37 real questions
    from a 100-question exam before this existed).
    """
    salvaged = []
    for candidate in _find_balanced_objects(text):
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict) and "options" in parsed and (
            "text" in parsed or "question_text" in parsed
        ):
            salvaged.append(parsed)
    return salvaged


def extract_json_payload(text):
    if not text:
        raise ValueError("AI response was empty")

    original_text = text
    stripped = text.strip()

    # Try a direct parse FIRST. This is actually the common/expected case
    # here - Gemini's responseMimeType="application/json" mode returns
    # bare JSON with no markdown wrapper at all - so this succeeds most
    # of the time and skips the fence-stripping step entirely.
    #
    # Trying this first (rather than unconditionally stripping fences
    # before ever attempting a parse, which is what this function used to
    # do) also fixes a real bug: JSON_BLOCK_RE.search() scans the WHOLE
    # response for any ``` occurrence, anywhere - including one embedded
    # INSIDE a JSON string value, e.g. a question whose own text is "What
    # is the output of this program?\n```c\n#include <stdio.h>\n...```"
    # (completely normal for a C/C++ programming question). The old code
    # would find that inner fence, grab everything between it and the
    # NEXT ``` as if THAT were "the JSON", and discard the real, fully
    # valid `{"questions": [...]}` around it - producing "Expecting
    # value: line 1 column 1" because a raw C code fragment obviously
    # isn't JSON. Confirmed directly: every one of the "_parse" failures
    # on a real job had a response that started with valid JSON in the
    # response-preview diagnostic, and every failing chunk contained a
    # question with an embedded ```c / ```cpp code block.
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    # Direct parse failed - NOW consider that the response might genuinely
    # be wrapped in an outer fence (some models do add ```json ... ```
    # around the whole reply). Anchor the match to the start and end of
    # the string (not a bare .search() anywhere in the middle) so an
    # embedded code fence deeper in the text can never be mistaken for
    # the outer wrapper the way the old unanchored regex was.
    fenced = re.match(r"```(?:json)?\s*(.*)```\s*$", stripped, re.IGNORECASE | re.DOTALL)
    text = fenced.group(1).strip() if fenced else stripped

    try:
        return json.loads(text)
    except json.JSONDecodeError as first_error:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass

        # Both the direct parse and the whole-response bracket-slice
        # failed. Previously that meant the entire chunk's questions were
        # silently discarded even if most of them were written out
        # correctly before the break - recover whatever individual
        # question objects are still well-formed instead of giving up
        # entirely.
        salvaged = salvage_question_objects(text)
        if salvaged:
            return {"questions": salvaged}

        # first_error's own message ("Expecting value: line 1 column 1
        # (char 0)") is what json.JSONDecodeError says for ANY text that
        # doesn't open with a valid JSON token - not just a genuinely
        # empty string. Attaching a preview of the real response text is
        # what turns that from a dead end into something actionable for
        # whatever failure mode shows up next.
        preview = original_text[:300].replace("\n", " ")
        raise ValueError(
            f"{first_error} — response preview: {preview!r}"
        ) from first_error


