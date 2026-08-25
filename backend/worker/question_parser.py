import re


QUESTION_START_RE = re.compile(
    r"(?im)(?:^|\n)\s*(?:q(?:uestion)?\.?\s*)?(\d{1,4})[\).:\-,]\s+"
)

OPTION_RE = re.compile(
    r"(?is)(?:^|\n)\s*(?:\(?([A-Da-d])\)?[\).:\-])\s+(.+?)(?=(?:\n\s*\(?[A-Da-d]\)?[\).:\-]\s+)|\Z)"
)

# Same marker shape as OPTION_RE, but not anchored to the start of a line.
# Needed because scanned exam PDFs often lay options out in a 2-column grid
# ((A) ... (B) ... on one row, (C) ... (D) ... on the next), and OCR
# linearizes that inconsistently - sometimes 2 options end up on one text
# line, sometimes all 4. OPTION_RE alone then either merges two options
# together or, worse, swallows B/C/D entirely into A's captured text,
# leaving only 1 "option" - which drops the whole question (see
# parse_options below). This pattern finds every marker regardless of line
# position; the strict A-then-B-then-C-then-D sequence check when it's used
# is what keeps it from misfiring on incidental "(a)/(b)"-style text inside
# a question stem.
OPTION_MARKER_ANYWHERE_RE = re.compile(r"\(?([A-Da-d])\)?[\).:\-]\s+")

ANSWER_RE = re.compile(
    r"(?i)(?:answer|ans|correct\s+option)\s*[:\-]?\s*\(?([A-D])\)?"
)

TOPIC_RE = re.compile(r"(?im)^topic\s*[:\-]\s*(.+)$")

# A real MCQ option is a short phrase. A regex block that swallowed several
# questions' worth of text (see parse_questions below) reliably breaks one
# of these two assumptions, which is what makes them useful as a "this
# block is corrupted" detector rather than a real content constraint.
MAX_PLAUSIBLE_OPTIONS = 6
MAX_PLAUSIBLE_OPTION_LENGTH = 220

# QUESTION_START_RE deliberately matches ANY 1-4 digit line-start number
# (no "Q"/"Question" prefix required - real exam PDFs often number plainly,
# e.g. "17." with nothing else), which means it also matches numbers that
# were never question numbers at all: an answer-key ID column, a roll
# number example, a stray year in a footer. On a real JEE Advanced PDF this
# produced two "questions" numbered 2027 and 2039 out of an otherwise
# normal 1-51 range - each apparently followed by enough A)/B)/C)/D)-shaped
# text to also pass the option-count/length checks below, so those alone
# didn't catch it. Since _missing_question_numbers() (ai/provider.py) later
# does `range(1, max(known_numbers) + 1)`, a single number this implausible
# balloons "missing" to ~2000 fake gaps. A real exam is never in the
# thousands of questions, so anything past this is treated as noise rather
# than a genuine question number.
MAX_PLAUSIBLE_QUESTION_NO = 999


def _collapse_horizontal_whitespace(text):
    # `re.sub(r"[ \t]+", " ", text)` applied to the whole blob (the
    # previous approach here, and in remove_options_from_text below) is
    # NOT line-aware - it collapses leading indentation on every line down
    # to a single space just as aggressively as it collapses accidental
    # multi-space runs mid-sentence. For ordinary prose that's invisible,
    # but for a code/pseudocode snippet it destroys exactly the structure
    # (nested indent levels) that makes it readable as code. Collapse
    # runs of horizontal whitespace only WITHIN each line's content,
    # leaving that line's own leading whitespace untouched.
    lines = []
    for line in text.split("\n"):
        stripped = line.rstrip()
        indent_len = len(stripped) - len(stripped.lstrip(" \t"))
        indent, rest = stripped[:indent_len], stripped[indent_len:]
        lines.append(indent + re.sub(r"[ \t]+", " ", rest))
    return "\n".join(lines)


def normalize_text(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _collapse_horizontal_whitespace(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_question_blocks(text):
    matches = list(QUESTION_START_RE.finditer(text))
    blocks = []

    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        question_no = int(match.group(1))
        blocks.append((question_no, text[start:end].strip()))

    return blocks


def parse_options_relaxed(block):
    # Fallback for options that aren't one-per-line (see
    # OPTION_MARKER_ANYWHERE_RE above). Only accept markers that occur in
    # strict A, B, C, D order - that sequence is a much stronger signal of
    # "these are the answer options" than a bare letter+punctuation match,
    # and is what keeps this from treating incidental "(a) ... (b) ..."
    # phrasing inside a question's own text as options.
    markers = []
    expected = "A"
    for match in OPTION_MARKER_ANYWHERE_RE.finditer(block):
        letter = match.group(1).upper()
        if letter != expected:
            continue
        markers.append(match)
        expected = chr(ord(expected) + 1)
        if expected > "D":
            break

    if len(markers) < 2:
        return []

    options = []
    for index, match in enumerate(markers):
        start = match.end()
        end = markers[index + 1].start() if index + 1 < len(markers) else len(block)
        option_text = block[start:end].strip()
        option_text = ANSWER_RE.sub("", option_text).strip()
        option_text = re.sub(r"\s+", " ", option_text)
        if option_text:
            options.append(option_text)

    return options


def parse_options(block):
    options = []
    for match in OPTION_RE.finditer(block):
        option_text = match.group(2).strip()
        option_text = ANSWER_RE.sub("", option_text).strip()
        option_text = re.sub(r"\s+", " ", option_text)
        if option_text:
            options.append(option_text)

    # The strict line-anchored pass above is kept as the primary path since
    # it's the more conservative match. Only reach for the relaxed,
    # line-agnostic pass when the strict one didn't find enough real
    # options (either 0, because every marker after the first was mid-line,
    # or a garbled 2-that-should-have-been-4 - see module docstring above
    # OPTION_MARKER_ANYWHERE_RE for both failure modes).
    relaxed_options = parse_options_relaxed(block)
    if len(relaxed_options) > len(options):
        return relaxed_options

    return options


def parse_answer(block):
    match = ANSWER_RE.search(block)
    if not match:
        return [0]

    return [ord(match.group(1).upper()) - ord("A")]


def strip_question_prefix(question_no, block):
    pattern = re.compile(
        rf"(?is)^\s*(?:q(?:uestion)?\.?\s*)?{question_no}[\).:\-,]\s+"
    )
    return pattern.sub("", block, count=1).strip()


def remove_options_from_text(text):
    first_option = re.search(r"(?im)(?:^|\n)\s*\(?[A-Da-d]\)?[\).:\-]\s+", text)
    if first_option:
        text = text[: first_option.start()]

    text = ANSWER_RE.sub("", text)

    # Previously this was `re.sub(r"\s+", " ", text).strip()`, which
    # collapses EVERY run of whitespace - including newlines and
    # indentation - into a single space. That destroys any code/pseudocode
    # formatting present in the source question (see normalize_text above,
    # which now deliberately preserves per-line indentation for exactly
    # this reason - this function was undoing that work). Reuse the same
    # line-aware collapse instead of a blob-wide one.
    text = _collapse_horizontal_whitespace(text)
    # ANSWER_RE removal above can leave a run of blank lines behind (e.g.
    # an "Answer: B" line sitting between two blank lines); re-cap it the
    # same way normalize_text does.
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def infer_topic(block):
    match = TOPIC_RE.search(block)
    if match:
        return match.group(1).strip()
    return None


def confidence_for(question_text, options, answer_indexes):
    confidence = 35
    if len(question_text) >= 20:
        confidence += 25
    if len(options) >= 4:
        confidence += 25
    elif len(options) >= 2:
        confidence += 10
    if answer_indexes and all(0 <= index < len(options) for index in answer_indexes):
        confidence += 15
    return min(confidence, 95)


def parse_questions(pages):
    combined = "\n\n".join(
        f"\n[PAGE {page['page']}]\n{page['text']}" for page in pages
    )
    text = normalize_text(combined)
    page_lookup = []

    for page in pages:
        for match in QUESTION_START_RE.finditer(page["text"]):
            page_lookup.append((int(match.group(1)), page["page"]))

    page_by_question = {}
    for question_no, page in page_lookup:
        page_by_question.setdefault(question_no, page)

    parsed = []
    seen_numbers = set()

    for fallback_index, (question_no, block) in enumerate(split_question_blocks(text), start=1):
        if question_no > MAX_PLAUSIBLE_QUESTION_NO:
            # Not a real question number (see MAX_PLAUSIBLE_QUESTION_NO
            # above) - skip the block entirely rather than renumbering it
            # into the sequence, since it isn't actually a missed question.
            continue
        if question_no in seen_numbers:
            question_no = max(seen_numbers) + 1
        seen_numbers.add(question_no)

        raw_question = strip_question_prefix(question_no, block)
        options = parse_options(raw_question)

        if len(options) < 2:
            continue

        # A regex block that swallowed several questions' worth of text
        # (see the module docstring above OPTION_MARKER_ANYWHERE_RE) shows
        # up in one of two ways: either way more than the normal ~4
        # options get found, or exactly 4 get found but the last one's
        # text runs on for multiple sentences - the swallowed content of
        # whatever questions came after it, since nothing later matched
        # the strict A-then-B-then-C-then-D sequence needed to end it
        # cleanly. Reject blocks shaped like this outright. Without this,
        # a corrupted multi-question blob still scores confidently in
        # confidence_for() below (it has "4+ options" and "an answer"),
        # which is exactly what let bad regex data outrank a correct AI
        # answer during reconciliation on a real 100-question exam - see
        # reconcile.py's per-question merge.
        if len(options) > MAX_PLAUSIBLE_OPTIONS:
            continue
        if any(len(option) > MAX_PLAUSIBLE_OPTION_LENGTH for option in options):
            continue

        answer_indexes = parse_answer(raw_question)
        answer_indexes = [
            index for index in answer_indexes if 0 <= index < len(options)
        ] or [0]

        question_text = remove_options_from_text(raw_question)
        if not question_text:
            question_text = f"Question {question_no}"

        parsed.append(
            {
                "question_no": question_no or fallback_index,
                "topic": infer_topic(block),
                "text": question_text,
                "options": options,
                "correct_option_indexes": answer_indexes,
                "source_page": page_by_question.get(question_no),
                "confidence": confidence_for(question_text, options, answer_indexes),
                "metadata": {
                    "parser": "regex_v1",
                    "rawBlockPreview": block[:500],
                },
            }
        )

    return parsed