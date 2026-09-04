// JS port of backend/worker/math_validator.py - kept algorithmically
// identical (same regex, same brace-counting logic) deliberately, so a
// question flagged by the worker at extraction time and the same
// question re-checked by a backend backfill script agree on what counts
// as broken. Two copies exist only because the worker runs as Python and
// backfills in this project run as Node (backend/src/db/*.js) - there's
// no single runtime both could share from. If the balance-check logic
// here is ever changed, worker/math_validator.py needs the equivalent
// change or the two can silently start disagreeing.
//
// See worker/math_validator.py's own file comment for why this is a
// brace/bracket balance check rather than a full LaTeX grammar
// validator, and math-validator.selftest.js for the cases (including
// the original Sandmeyer-reaction bug this was built from) this is
// checked against.

// Same four delimiter shapes MathText.jsx/richTextDoc.js recognize.
const MATH_SPAN_RE =
  /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\n$]+?\$|\\\([\s\S]+?\\\))/g;

function stripDelimiters(token) {
  if (token.startsWith("$$") && token.endsWith("$$")) {
    return token.slice(2, -2);
  }
  if (token.startsWith(String.raw`\[`) && token.endsWith(String.raw`\]`)) {
    return token.slice(2, -2);
  }
  if (token.startsWith(String.raw`\(`) && token.endsWith(String.raw`\)`)) {
    return token.slice(2, -2);
  }
  return token.slice(1, -1); // single-$ inline math
}

function checkBalance(latex) {
  let curlyDepth = 0;
  let squareDepth = 0;

  for (const ch of latex) {
    if (ch === "{") {
      curlyDepth++;
    } else if (ch === "}") {
      curlyDepth--;
      if (curlyDepth < 0) {
        return "unmatched '}' - a closing brace with no matching '{'";
      }
    } else if (ch === "[") {
      squareDepth++;
    } else if (ch === "]") {
      squareDepth--;
      if (squareDepth < 0) {
        return "unmatched ']' - a closing bracket with no matching '['";
      }
    }
  }

  if (curlyDepth > 0) {
    const plural = curlyDepth > 1 ? "s" : "";
    return `missing ${curlyDepth} closing '}' (unclosed '{'${plural})`;
  }
  if (squareDepth > 0) {
    const plural = squareDepth > 1 ? "s" : "";
    return `missing ${squareDepth} closing ']' (unclosed '['${plural})`;
  }

  return null;
}

export function findMathErrors(text) {
  if (!text) return [];

  const errors = [];
  for (const match of text.matchAll(MATH_SPAN_RE)) {
    const latex = stripDelimiters(match[0]);
    const problem = checkBalance(latex);
    if (problem) {
      errors.push({ expr: latex.trim(), error: problem });
    }
  }

  return errors;
}

// Fields on a question_contents row that can carry math - passage/
// explanation/questionText mirror worker/math_validator.py's TEXT_FIELDS,
// options is handled separately below since it's an array, not a string.
export function findAllMathErrors({ questionText, explanation, passage, options }) {
  const errors = [];

  for (const [field, value] of [
    ["text", questionText],
    ["explanation", explanation],
    ["passage", passage],
  ]) {
    if (value) {
      for (const err of findMathErrors(value)) {
        errors.push({ ...err, field });
      }
    }
  }

  (options || []).forEach((option, index) => {
    const optionText =
      typeof option === "string" ? option : option?.optionText || "";
    for (const err of findMathErrors(optionText)) {
      errors.push({ ...err, field: `options[${index}]` });
    }
  });

  return errors;
}
