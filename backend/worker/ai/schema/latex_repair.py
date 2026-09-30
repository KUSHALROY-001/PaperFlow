"""Deterministic clean-up for the LaTeX/JSON-escaping mistakes the extraction
model makes often enough that they can't be left to a human to notice.

Every rule here fixes a pattern actually observed in saved questions:

  * "\\n" written where a real line break was meant - the model doubled the
    backslash in the JSON escape, so the page shows a literal backslash-n
    (usually wrapped in its own $...$ because the prompt says any backslash
    command must sit inside delimiters).
  * a matrix / cases / aligned row separator "\\\\" that arrived as a single
    backslash followed by a line break.
  * $$ ... $ - a display equation opened with $$ but closed with one $.
  * control characters (form feed, backspace) left behind when the model
    wrote a single-backslash \\frac / \\beta inside a JSON string and the
    parser read it as the \\f / \\b escape.

Bare LaTeX outside any delimiter (whole stems such as "y \\ge 0 ... \\vec{B}
= B_{0}\\hat{k}" with no $ at all, or answer combinations like "P \\to 3; Q
\\to 4") is wrapped by wrap_bare_latex below. Prompt rules alone did not stop
the model doing this on inline fragments, so the fix is deterministic. Text
it cannot wrap safely (an environment such as \\begin{cases}, or unbalanced
braces) is left alone and stays flagged by math_validator.find_math_errors,
so it still lands in the Review Queue.
"""

import re

# LaTeX commands that begin with "n". A literal backslash-n followed by one
# of these is the command, not a mis-escaped line break.
_N_COMMANDS = (
    "eq", "e", "u", "abla", "ot", "otin", "i", "ewline", "olimits", "leq",
    "geq", "leqslant", "geqslant", "mid", "sim", "parallel", "Rightarrow",
    "rightarrow", "leftarrow", "leftrightarrow", "Leftarrow",
    "Leftrightarrow", "exists", "subseteq", "supseteq", "warrow", "earrow",
    "atural", "ewcommand", "prec", "succ", "cong", "vdash", "vDash", "less",
    "gtr", "subset", "supset",
)

_LITERAL_NEWLINE_RE = re.compile(
    r"(?<!\\)((?:\\\\)*)\\n(?!(?:"
    + "|".join(sorted(_N_COMMANDS, key=len, reverse=True))
    + r")(?![A-Za-z]))"
)


def _fix_display_closers(text):
    """$$ ... $  ->  $$ ... $$. A properly closed $$...$$ is left alone."""
    out = []
    i = 0
    n = len(text)
    while i < n:
        if text.startswith("$$", i):
            closer = text.find("$$", i + 2)
            single = text.find("$", i + 2)
            if closer != -1 and (single == -1 or closer <= single):
                out.append(text[i : closer + 2])
                i = closer + 2
                continue
            if single != -1:
                out.append(text[i:single] + "$$")
                i = single + 1
                continue
            out.append(text[i:])
            break
        out.append(text[i])
        i += 1
    return "".join(out)


# --- bare LaTeX -> $...$ ---------------------------------------------------

# Regions that must never be touched: code, image markers, and math that is
# already delimited.
_PROTECTED_RE = re.compile(
    r"(```[\s\S]*?```|`[^`\n]*`|!\[\[[^\]\n]*\]\]"
    r"|\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\n$]+?\$|\\\([\s\S]+?\\\))"
)
_CMD_RE = re.compile(r"\\[A-Za-z]+")
_WORD_RE = re.compile(r"[A-Za-z]+")
_NUM_RE = re.compile(r"\d+(?:\.\d+)?")

# Short ordinary English words. Any OTHER 1-2 letter token (kx, dx, cm, kg)
# is treated as a math symbol, and 3+ letter lowercase words are prose.
_ENGLISH_SHORT = {
    "an", "as", "at", "be", "by", "do", "go", "he", "if", "in", "is", "it",
    "me", "my", "no", "of", "on", "or", "so", "to", "up", "us", "we",
}
_CAPS_WORDS = {
    "NOT", "AND", "THE", "FOR", "ARE", "ALL", "ANY", "BUT", "ONE", "TWO",
    "NO", "OR", "IF", "IS", "IN", "TO", "OF",
}
_MATH_WORDS = {
    "sin", "cos", "tan", "cot", "sec", "csc", "ln", "log", "exp", "min",
    "max", "lim", "det",
}
_OP_CHARS = set("=+-*/<>()[]~%&") | set("\u00d7\u00f7\u00b1\u2264\u2265\u2260\u2248\u2192\u2190\u2194\u221e\u00b0")
_SEP_CHARS = set(",;:")


def _consume_group(s, i):
    """s[i] == '{'. Index just past the matching '}', or -1 if unbalanced
    or the group runs onto a new line."""
    depth = 0
    j = i
    n = len(s)
    while j < n:
        c = s[j]
        if c == "\\":
            j += 2
            continue
        if c == "\n":
            return -1
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return j + 1
        j += 1
    return -1


def _scan_scripts(s, j):
    """Consume _x / ^{...} directly attached at s[j:]. Returns (end, has_brace)."""
    n = len(s)
    brace = False
    while j + 1 < n and s[j] in "_^":
        nxt = s[j + 1]
        if s[j] == "_" and nxt == "_":
            break  # a "____" answer blank, not a subscript
        if nxt == "{":
            k = _consume_group(s, j + 1)
            if k == -1:
                break
            j = k
            brace = True
        elif nxt.isalnum():
            j += 2
        elif nxt == "\\":
            m = _CMD_RE.match(s, j + 1)
            if not m:
                break
            j = m.end()
            brace = True
        else:
            break
    return j, brace


def _classify_word(w, s, j, has_script):
    if len(w) == 1:
        # "a" / "A" / "I" followed by an ordinary word is English, not math.
        if w in ("a", "A", "I") and not has_script:
            if re.match(r"[ \t]+[a-z]{2,}", s[j : j + 40]):
                return "stop"
        return "sym"
    if w in _MATH_WORDS:
        return "sym"
    if w in _CAPS_WORDS:
        return "stop"
    if len(w) <= 3 and w.isupper():
        return "sym"
    if has_script and len(w) <= 3 and w.lower() not in _ENGLISH_SHORT:
        return "sym"
    if len(w) == 2 and w.islower() and w not in _ENGLISH_SHORT:
        return "sym"
    return "stop"


def _tokenize(s):
    """(kind, start, end, trigger). kinds: cmd sym op ws sep stop.
    trigger marks tokens that make a run worth wrapping (a backslash
    command, or a brace sub/superscript such as S_{1} or 10^{-5})."""
    toks = []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c == "\\":
            m = _CMD_RE.match(s, i)
            if m:
                j = m.end()
                broken = False
                while j < n and s[j] == "{":
                    k = _consume_group(s, j)
                    if k == -1:
                        broken = True  # unclosed brace - e.g. a truncated
                        break          # \frac{1}{2 with no closing brace
                    j = k
                if broken:
                    # Don't wrap a fragment of a broken command - e.g.
                    # \frac{1}{2 becoming $\frac{1}${2, splitting it
                    # further. Consume the rest of the line untouched so
                    # nothing after it gets swept into a wrap either.
                    end_of_line = s.find("\n", i)
                    j = end_of_line if end_of_line != -1 else n
                    toks.append(("stop", i, j, False))
                    i = j
                    continue
                j, _ = _scan_scripts(s, j)
                toks.append(("cmd", i, j, True))
                i = j
                continue
            if i + 1 < n and s[i + 1] in ",;:!{}|\\ ":
                toks.append(("op", i, i + 2, False))
                i += 2
                continue
            toks.append(("stop", i, i + 1, False))
            i += 1
            continue
        if c in " \t":
            j = i
            while j < n and s[j] in " \t":
                j += 1
            toks.append(("ws", i, j, False))
            i = j
            continue
        if c.isdigit():
            j = _NUM_RE.match(s, i).end()
            j, brace = _scan_scripts(s, j)
            toks.append(("sym", i, j, brace))
            i = j
            continue
        if c.isascii() and c.isalpha():
            m = _WORD_RE.match(s, i)
            w, j = m.group(), m.end()
            end, brace = _scan_scripts(s, j)
            if _classify_word(w, s, j, end > j) == "sym":
                toks.append(("sym", i, end, brace))
                i = end
            else:
                toks.append(("stop", i, j, False))
                i = j
            continue
        if c == "{":
            k = _consume_group(s, i)
            if k == -1:
                toks.append(("stop", i, i + 1, False))
                i += 1
            else:
                j, brace = _scan_scripts(s, k)
                toks.append(("sym", i, j, brace))
                i = j
            continue
        if c in _OP_CHARS:
            toks.append(("op", i, i + 1, False))
        elif c in _SEP_CHARS:
            toks.append(("sep", i, i + 1, False))
        else:
            toks.append(("stop", i, i + 1, False))
        i += 1
    return toks


def _trim_run(core):
    """Drop whitespace/separators and unmatched brackets at the edges.
    Returns (chars removed from the front, trimmed text)."""
    lead = 0
    while True:
        stripped = core.strip(" \t,;:")
        lead += len(core) - len(core.lstrip(" \t,;:"))
        core = stripped
        if core.endswith(")") and core.count(")") > core.count("("):
            core = core[:-1]
        elif core.endswith("]") and core.count("]") > core.count("["):
            core = core[:-1]
        elif core.startswith("(") and core.count("(") > core.count(")"):
            core = core[1:]
            lead += 1
        else:
            return lead, core


def _wrap_prose(seg):
    if "\\" not in seg and "_{" not in seg and "^{" not in seg:
        return seg
    # Environments and row breaks need the whole block delimited together;
    # wrapping fragments would break them, so leave those flagged.
    if "\\begin{" in seg or "\\end{" in seg or "\\\\" in seg:
        return seg

    toks = _tokenize(seg)
    m = len(toks)
    edits = []
    idx = 0
    # Bounds how many tokens one run can absorb - a circuit breaker, not a
    # realistic limit for actual exam text (the longest genuine bare-LaTeX
    # run seen while building this was well under 20 tokens). Without it,
    # a long stretch of plain single-letter words with no operator between
    # them (each alone counts as "sym" - see _classify_word, since a lone
    # capital letter is routinely a variable name like "Let M denote...")
    # could in principle chain into one unbounded $...$ span if a trigger
    # token happened to sit at the far end of it.
    MAX_RUN_TOKENS = 60
    while idx < m:
        if toks[idx][0] not in ("cmd", "sym", "op"):
            idx += 1
            continue
        k = idx
        last = idx
        while k < m and (k - idx) < MAX_RUN_TOKENS:
            kind = toks[k][0]
            if kind in ("cmd", "sym", "op"):
                last = k
                k += 1
            elif kind == "ws":
                k += 1
            elif kind == "sep":
                p = k + 1
                while p < m and toks[p][0] == "ws":
                    p += 1
                if p < m and (
                    toks[p][0] in ("cmd", "sym")
                    or (toks[p][0] == "op" and seg[toks[p][1]] in "([")
                ):
                    k = p
                else:
                    break
            else:
                break
        run = toks[idx : last + 1]
        idx = last + 1
        if not any(tok[3] for tok in run):
            continue
        start, end = run[0][1], run[-1][2]
        lead, core = _trim_run(seg[start:end])
        if not core or not ("\\" in core or "_{" in core or "^{" in core):
            continue
        if core.count("{") != core.count("}"):
            continue
        edits.append((start + lead, start + lead + len(core), core))

    if not edits:
        return seg
    out, pos = [], 0
    for a, b, core in edits:
        out.append(seg[pos:a])
        out.append("$" + core + "$")
        pos = b
    out.append(seg[pos:])
    return "".join(out)


def wrap_bare_latex(text):
    """Wrap LaTeX that sits outside any $ delimiter in $...$. Code, image
    markers and already-delimited math are never modified, and a text with
    nothing bare in it comes back unchanged."""
    if not text or not isinstance(text, str):
        return text
    parts = _PROTECTED_RE.split(text)
    for i in range(0, len(parts), 2):
        parts[i] = _wrap_prose(parts[i])
    return "".join(parts)


def _strip_stray_prose_linebreaks(text):
    """Delete a LaTeX row-separator token ("\\\\", two literal backslash
    characters) sitting in PROSE right next to a real newline, keeping the
    newline itself.

    \\\\ is a real, meaningful LaTeX command - "break to a new row here" -
    but it is only meaningful INSIDE a math environment (a matrix, cases,
    aligned, or array). Outside one, in ordinary sentence/paragraph text,
    it means nothing to the renderer and shows up on the page as two
    literal backslash characters sitting on their own line - exactly the
    artifact reported on Q8/Q9/Q10/Q11/Q12: a clean paragraph break
    (blank line) got "\\\\" inserted before it, once per line, because the
    model treated \\\\ as a general-purpose line separator rather than a
    math-environment-only one (the prompt's own row-separator guidance
    wasn't scoped tightly enough - see the JSON escaping rules in
    provider.py, which now says explicitly where \\\\ does and doesn't
    belong).

    Runs on UNPROTECTED text only (see _PROTECTED_RE) so a genuine row
    separator inside $$...$$ is never touched - only the same token
    appearing outside any math span is stray.
    """
    parts = _PROTECTED_RE.split(text)
    stray_re = re.compile(r"[ \t]*(?:\\\\)+[ \t]*(?=\n|$)")
    for i in range(0, len(parts), 2):
        parts[i] = stray_re.sub("", parts[i])
    return "".join(parts)


def repair_latex(text):
    if not text or not isinstance(text, str):
        return text

    text = _strip_stray_prose_linebreaks(text)

    text = text.replace("\x0c", "\\f").replace("\x08", "\\b")

    # "$\n$" - a mis-escaped line break the model wrapped in its own math
    # delimiters. Display-math neighbours first so their $$ survive.
    text = re.sub(r"\$\\n\$\$", "\n$$", text)
    text = re.sub(r"\$\$\\n\$", "$$\n", text)
    text = re.sub(r"\$\s*\\n\s*\$", "\n", text)

    text = _LITERAL_NEWLINE_RE.sub(lambda m: m.group(1) + "\n", text)

    # Row separator "\\" that lost a backslash: single "\" at end of line.
    text = re.sub(r"(?<!\\)\\(?=\n)", r"\\\\", text)

    return wrap_bare_latex(_fix_display_closers(text))


def repair_latex_list(values):
    return [repair_latex(value) for value in values]
