/**
 * Re-derives indentation from the RELATIVE structure the extraction
 * already captured - does this line's leading whitespace get deeper,
 * shallower, or stay the same compared to the previous non-blank line? -
 * and rescales that to a consistent `indentSize`. It does not try to
 * understand any language's syntax at all: no brace counting, no
 * Python-vs-C branching, no keyword matching.
 *
 * That's deliberate, not a simplification for its own sake. A
 * brace/keyword-aware indenter has to special-case every language
 * differently, and breaks on ordinary things a syntax-blind approach
 * simply can't be fooled by:
 *   - a `}` inside a `//` or `/* *\/` comment (used to permanently desync
 *     a brace-depth counter for every line after it)
 *   - a Python dict/set literal containing `{` (used to misroute real
 *     Python into a C-style brace indenter, or vice versa for a JS/Java
 *     snippet that merely contains the substring "import ")
 *   - an unbraced single-statement body (`if (x) doIt();`), which a
 *     brace-only indenter can't indent at all since there's no brace to
 *     count
 * None of those can happen here, because this never looks at line
 * CONTENT - only at each line's existing leading whitespace, which the
 * extraction pipeline (OCR + AI) generally gets structurally right even
 * when it can't be trusted to use a consistent number of spaces/tabs for
 * it.
 *
 * Trade-off worth knowing: if the extracted indentation is already
 * WRONG (a line that should be nested one level deeper but came out
 * flush-left), this preserves that mistake rather than fixing it. That's
 * intentional - preserving imperfect input beats what the old
 * brace-counting approach could do in the other direction, which was
 * actively invent a worse, cascading mistake the source never had.
 */
export function autoIndentCode(codeStr, indentSize = 4) {
  if (!codeStr) return codeStr;

  // Tab stop width used only to MEASURE each line's effective column
  // width, so a leading tab and leading spaces compare sanely against
  // each other. Never affects what gets emitted - output always uses
  // `indentSize` plain spaces per level, regardless of what the input used.
  const TAB_WIDTH = 4;

  // Small cushion so near-identical widths - e.g. OCR misreading a real
  // 4-column indent as 3 or 5 on one line - don't get treated as a
  // genuine change in nesting depth. Large enough to absorb typical OCR
  // jitter, small enough not to swallow a real (if narrow) indent step
  // like 2-space nesting.
  const TOLERANCE = 1;

  const indentUnit = " ".repeat(indentSize);
  const lines = codeStr.split("\n");

  function leadingColumns(line) {
    let col = 0;
    for (const ch of line) {
      if (ch === " ") col += 1;
      else if (ch === "\t") col += TAB_WIDTH - (col % TAB_WIDTH);
      else break;
    }
    return col;
  }

  // Column widths of the indent levels currently "open", shallowest
  // first - same idea as how a Python tokenizer tracks INDENT/DEDENT,
  // generalized to any language by never requiring exact multiples.
  const stack = [0];
  const result = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      result.push("");
      continue;
    }

    const width = leadingColumns(rawLine);

    while (stack.length > 1 && width < stack[stack.length - 1] - TOLERANCE) {
      stack.pop();
    }
    if (width > stack[stack.length - 1] + TOLERANCE) {
      stack.push(width);
    }

    const level = stack.length - 1;
    result.push(indentUnit.repeat(level) + trimmed);
  }

  return result.join("\n");
}

const CODE_FENCE_RE = /(```\w*\n)([\s\S]*?)(```)/g;

// #include<x>/#include"x", int main(, public static void main(, void main(,
// or a class declaration immediately followed by its body/inheritance
// clause (class Foo { / class Foo extends Bar / class Foo implements Baz).
// Each requires the actual code shape (parens, brace, or clause keyword),
// not just the bare word - see the comment where this is used.
const UNFENCED_CODE_RE =
  /#include\s*[<"]|int\s+main\s*\(|public\s+static\s+void\s+main\s*\(|void\s+main\s*\(|class\s+\w+\s*(\{|extends|implements)/i;

/**
 * Auto-indents all markdown code blocks within a string.
 * If no code blocks exist but code patterns are detected, wraps and indents the code.
 */
export function autoIndentMarkdown(text) {
  if (!text) return text;

  if (text.includes("```")) {
    return text.replace(
      CODE_FENCE_RE,
      (match, openFence, codeBody, closeFence) => {
        const indented = autoIndentCode(codeBody.trim());
        return `${openFence}${indented}\n${closeFence}`;
      },
    );
  }

  // Detect unfenced code patterns (#include, int main(), public static void
  // main(), a class declaration with a body/inheritance clause). Anchored
  // to actual code SHAPES (parens after `main`, a brace/extends/implements
  // right after a class name), not bare keywords - `class\s+\w+` alone
  // used to match ordinary prose like "the class Rectangle has four
  // sides", which would then get wrapped and auto-indented as code.
  if (UNFENCED_CODE_RE.test(text)) {
    const lines = text.split("\n");
    const codeStartIdx = lines.findIndex((line) => UNFENCED_CODE_RE.test(line));

    if (codeStartIdx !== -1) {
      const prose = lines.slice(0, codeStartIdx).join("\n").trim();
      const code = lines.slice(codeStartIdx).join("\n").trim();

      // One matching line isn't enough on its own to commit to wrapping
      // everything after it as code - e.g. "class Rectangle extends
      // Shape" with nothing else code-like around it could still be a
      // sentence describing inheritance, not a real declaration. Require
      // a second, independent code signal (a semicolon or brace
      // somewhere in the candidate block) or more than one non-blank
      // line before wrapping; otherwise leave the text untouched rather
      // than guess.
      const nonBlankLines = code
        .split("\n")
        .filter((line) => line.trim()).length;
      const looksLikeRealCode = /[;{]/.test(code) || nonBlankLines > 1;

      if (looksLikeRealCode) {
        const indentedCode = autoIndentCode(code);
        const lang = /#include|int\s+main/i.test(code) ? "c" : "java";
        const fence = `\`\`\`${lang}\n${indentedCode}\n\`\`\``;

        return prose ? `${prose}\n\n${fence}` : fence;
      }
    }
  }

  return text;
}
