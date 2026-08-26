// Standalone regression test for math-validator.js - no test framework
// is configured in this project, so this runs with plain `node`, same
// pattern as code-indenter.selftest.js:
//
//   node src/lib/math-validator.selftest.js
//
// Cases mirror worker/math_validator.selftest.py's exactly (same inputs,
// same expected results) - the two validators are separate ports of the
// same logic (see math-validator.js's file comment for why), so keeping
// their test cases in lockstep is what actually catches the two ever
// silently drifting apart, not just each one passing its own tests.
import { findMathErrors, findAllMathErrors } from "./math-validator.js";

const cases = [
  [
    "the exact bug from the Sandmeyer reaction cell - an extra '}' after \\text{Tollen's reagent} is caught",
    "The answer is $\\text{Toluene}\\xrightarrow{(iv)} \\text{Tollen's reagent}}{(i)} \\text{Cl}_2$ done.",
    1,
  ],
  [
    "the SAME reaction written correctly (balanced) is not flagged",
    "$\\text{Toluene} \\xrightarrow[(ii)H_3O^+]{(i)CrO_2Cl_2/CS_2} \\text{Benzoic acid}$",
    0,
  ],
  ["plain text with no math at all", "What is the capital of France?", 0],
  [
    "ordinary balanced math - a fraction",
    "Simplify $\\frac{1}{2} + \\frac{1}{3}$.",
    0,
  ],
  ["missing closing brace", "Compute $\\frac{1}{2$ please.", 1],
  [
    "missing closing bracket in \\xrightarrow[...]",
    "$A \\xrightarrow[B]{C$",
    1,
  ],
  [
    "two separate math spans, only the second is broken",
    "First $x + y = 5$, then $\\frac{1}{2$.",
    1,
  ],
  [
    "display math $$...$$ with a genuine imbalance",
    "$$\\int_0^1 x \\, dx = \\frac{1}{2}}$$",
    1,
  ],
  [
    "a literal currency amount is never mistaken for math",
    "The price is $50 and the tax is $5, total $55.",
    0,
  ],
  [
    "nested braces that are still correctly balanced",
    "$\\sqrt{\\frac{a^2}{b^2 + c^2}}$",
    0,
  ],
];

let failures = 0;

for (const [name, text, expectedCount] of cases) {
  const errors = findMathErrors(text);
  const ok = errors.length === expectedCount;
  console.log(
    `${ok ? "ok  " : "FAIL"} - ${name} (found ${errors.length}, expected ${expectedCount})`,
  );
  if (!ok) {
    failures++;
    for (const err of errors) console.log("      ", err);
  }
}

console.log("\n--- findAllMathErrors: field tagging ---");

const question = {
  questionText: "Balanced: $x^2$",
  explanation: "Broken: $\\frac{1}{2$",
  passage: null,
  options: ["A. $y = mx + b$", { optionText: "B. $\\text{H}_2\\text{O}}$" }],
};
const tagged = findAllMathErrors(question);
const expectedFields = ["explanation", "options[1]"].sort();
const foundFields = [...new Set(tagged.map((e) => e.field))].sort();
const taggingOk = JSON.stringify(foundFields) === JSON.stringify(expectedFields);
console.log(
  `${taggingOk ? "ok  " : "FAIL"} - flags explanation + options[1] only (found: ${JSON.stringify(foundFields)})`,
);
if (!taggingOk) failures++;

const total = cases.length + 1;
console.log(`\n${total - failures}/${total} passed.`);

if (failures > 0) {
  process.exitCode = 1;
}
