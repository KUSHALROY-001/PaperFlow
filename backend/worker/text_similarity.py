"""Shared "is this the same question, just transcribed differently" logic.

Used at BOTH places in the pipeline that have to decide whether two
extracted question dicts sharing a paper question_no are the same
question re-transcribed (by a different pass, or a different extractor
entirely) or a genuine subject restart (JEE Advanced's Physics/Chemistry/
Mathematics sections each restart their own Q.1..Q.N):

- ai/provider/question_matching.py, merging the AI extractor's own
  multiple passes (vision, text-chunk, vision-fallback, whole-PDF
  last-resort) with each other.
- reconcile.py, merging the regex parser's output against the AI
  extractor's (already-merged) final output.

This used to be two separate, differently-robust implementations:
question_matching.py's version was NFKC-normalized and stripped LaTeX
command noise (both added after real incidents - see
question_text_fingerprint's docstring), but reconcile.py had its own
much cruder copy (lowercase + collapse whitespace, nothing else) that
never got either fix. Since regex extracts raw PDF text (PyMuPDF, prone
to glyph-decomposition artifacts on embedded math fonts) and AI produces
clean LaTeX, that crude comparison very often judged a genuinely-matching
question "different" - which fed it into reconcile.py's own "different
body, same number -> keep both, renumber the regex one as a subject
restart" branch. The result was visible in two ways at once on the same
duplicate: an inflated question count (each false mismatch adds one), and
the duplicate itself reading badly - it's the regex parser's raw
extraction, which never had a marking scheme or subtopic classification
applied to it in the first place (only the AI-covered path gets that),
so it shows up with correct_option/marks fields still at their unset
defaults and garbled-looking text alongside a perfectly good AI version
of the same question sitting one slot earlier.

Extracted here as the single shared implementation instead of fixing
reconcile.py's copy in place, so the two merge points can't drift apart
like this again.
"""

import difflib
import re
import unicodedata


def _strip_formatting_noise(text):
    """
    Collapse LaTeX/markdown formatting differences that are cosmetic, not
    semantic - so two transcriptions of the SAME question from different
    extraction backends fingerprint the same even when one writes
    \\frac{a}{b} and the other \\dfrac{a}{b}, or one adds spaces around
    operators that the other doesn't.

    generate_json_from_pdf_images (reads the rendered page image) and
    generate_json_from_pdf (reads raw PDF bytes, used as the last-resort
    fallback), and the regex parser (reads the PDF's raw text layer
    directly) all transcribe the identical printed math into
    different-looking text often enough, on a paper this dense in
    notation, that leaving the raw text for difflib to compare directly
    produces false negatives: real duplicates score just under the
    similarity threshold and get misread as a subject-boundary restart
    (see is_same_extracted_question's docstring for the incidents this
    caused). Dropping LaTeX command names and all punctuation/whitespace
    - keeping only the actual letters, digits, and words - removes that
    noise while leaving the content two DIFFERENT questions would still
    diverge on completely untouched.
    """
    text = re.sub(r"\\[a-zA-Z]+", "", text)  # \frac, \dfrac, \left, \sqrt, ...
    text = re.sub(r"[^0-9a-z]+", "", text)  # drop braces, $, spaces, operators
    return text


def question_text_fingerprint(question):
    """
    Normalized prefix of the question body used to decide whether two
    extractions with the SAME paper question_no are the same question
    (e.g. overlapping vision chunks of one subject, the SAME question
    re-transcribed by a different extraction backend, or the regex
    parser's raw-text version of a question AI already extracted
    cleanly) or genuinely different ones (e.g. JEE Advanced Physics Q.1
    vs Chemistry Q.1 vs Mathematics Q.1 - each subject restarts numbering
    at 1).

    NFKC-normalized before comparison, not just lowercased/whitespace-
    collapsed - this matters specifically because the extraction methods
    that can produce competing results for the same question (rendered
    page images vs raw PDF bytes vs the regex parser's own raw-text read
    of the PDF) transcribe math notation differently even when they agree
    on the actual question text. Unicode's Mathematical Alphanumeric
    Symbols block (the math-italic 𝑎, 𝑏, ℝ, etc. that fill a real JEE
    Advanced PDF) has compatibility decompositions to plain ASCII letters
    for exactly this kind of case - NFKC collapses "𝑎𝑖" and "ai" (or "ℝ"
    and "R") to the same string, so two transcriptions of the identical
    question fingerprint the same instead of silently failing the
    comparison below and being misread as a subject-boundary restart (see
    the real incident this caused: a JEE paper's true 48 questions came
    back as 69, because ~23 re-transcriptions from the whole-PDF fallback
    didn't fingerprint-match their already-found counterpart from the
    page-image vision pass and got renumbered as new questions instead of
    recognized as duplicates).

    NFKC alone still wasn't enough on a second JEE Advanced paper this
    dense in plain LaTeX (51 questions came back as 73) - the two AI
    backends also disagree on LaTeX macros and spacing for the SAME
    printed expression (\\frac vs \\dfrac, spacing around operators,
    \\left(\\right) vs bare parens), which NFKC doesn't touch since none
    of that is a Unicode compatibility variant. _strip_formatting_noise
    handles that layer by dropping command names and all
    punctuation/whitespace, leaving only the letters/digits two
    re-transcriptions of the same question actually still agree on. Kept
    as a separate step (not folded into NFKC above) since it's a
    different kind of noise with a different fix, worth documenting on
    its own.
    """
    text = (question.get("text") or "")
    text = unicodedata.normalize("NFKC", text)
    text = text.strip().lower()
    text = re.sub(r"\s+", " ", text)
    text = _strip_formatting_noise(text)
    return text[:300]


def is_same_extracted_question(existing, new):
    """
    True when two results with the same paper number are almost certainly
    the same physical question (chunk overlap / fuller re-extraction, a
    re-transcription of the same question through a different extraction
    backend, or the regex parser's raw-text version of something AI
    already found), not a subject-boundary restart.
    """
    fp_a = question_text_fingerprint(existing)
    fp_b = question_text_fingerprint(new)
    if not fp_a or not fp_b:
        # No body to compare - treat as same number collision that should
        # follow the caller's own overwrite-preference, not as a
        # guaranteed subject restart (empty bodies are more often parse
        # failures than new subjects).
        return True
    if fp_a == fp_b:
        return True
    # Partial page-split: one extraction has a stub, the other the rest.
    # Threshold is intentionally low (~24 chars) so short stems still match
    # a fuller re-extraction of the same question across chunk boundaries.
    if len(fp_a) >= 24 and fp_a[:80] in fp_b:
        return True
    if len(fp_b) >= 24 and fp_b[:80] in fp_a:
        return True
    # Exact/substring matching catches near-identical transcriptions, but
    # NFKC normalization alone doesn't close the whole gap between
    # extraction backends - the two AI call styles, and the regex parser's
    # raw-text read, can all still transcribe fractions, spacing around
    # operators, or a leading "Q.1" label differently for the SAME
    # question. Fall back to overall similarity rather than treating any
    # remaining difference as proof of a subject restart. A genuine
    # subject restart (Math Q.1 vs Physics Q.1 vs Chemistry Q.1) shares at
    # most a short boilerplate opener ("let r denote the set of all real
    # numbers." - several questions in a real JEE Advanced paper open with
    # exactly that) before diverging completely, which scores well under
    # this threshold; a re-transcription of the SAME question scores well
    # above it even with formatting noise spread throughout.
    similarity = difflib.SequenceMatcher(None, fp_a, fp_b).ratio()
    return similarity >= 0.72
