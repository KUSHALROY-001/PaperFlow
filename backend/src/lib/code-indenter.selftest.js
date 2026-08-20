// Standalone regression check for autoIndentCode - no test framework is
// configured in this project, so this runs with plain `node` the same
// way backfill-code-formatting.js does:
//
//   node src/lib/code-indenter.selftest.js
//
// Each case is something the OLD brace/keyword-heuristic indenter got
// wrong (see the PR discussion this replaced it over) - a comment
// containing a brace, a Python dict literal containing a brace, an
// unbraced if-body, and OCR-typical +/-1 column jitter between sibling
// lines. The new algorithm never inspects line content at all, so none
// of these should be able to confuse it - that's exactly what these
// cases pin down.
import { autoIndentCode, autoIndentMarkdown } from "./code-indenter.js";

const cases = [
  {
    name: "comment containing a closing brace doesn't desync depth",
    input: [
      "int main() {",
      "  // closes something like this: }",
      "  int x = 5;",
      "  if (x > 0) {",
      "    return x;",
      "  }",
      "  return 0;",
      "}",
    ].join("\n"),
    expected: [
      "int main() {",
      "    // closes something like this: }",
      "    int x = 5;",
      "    if (x > 0) {",
      "        return x;",
      "    }",
      "    return 0;",
      "}",
    ].join("\n"),
  },
  {
    name: "Python dict literal containing braces isn't mistaken for C",
    input: [
      "def foo():",
      '  d = {"a": 1, "b": 2}',
      "  if d:",
      "    return d",
      "  return None",
    ].join("\n"),
    expected: [
      "def foo():",
      '    d = {"a": 1, "b": 2}',
      "    if d:",
      "        return d",
      "    return None",
    ].join("\n"),
  },
  {
    name: "unbraced if-body gets indented (impossible for a brace-only indenter)",
    input: ["if (x > 0)", "  doSomething();", "doNext();"].join("\n"),
    expected: ["if (x > 0)", "    doSomething();", "doNext();"].join("\n"),
  },
  {
    name: "+/-1 column OCR jitter between sibling lines doesn't create a spurious level",
    input: [
      "int main() {",
      "   int x = 1;",
      "    int y = 2;",
      "   return x + y;",
      "}",
    ].join("\n"),
    expected: [
      "int main() {",
      "    int x = 1;",
      "    int y = 2;",
      "    return x + y;",
      "}",
    ].join("\n"),
  },
  {
    name: "JS import with no braces on early lines is not routed into a Python branch",
    input: [
      'import React from "react";',
      "",
      "function Greet(props) {",
      "  return props.name;",
      "}",
    ].join("\n"),
    expected: [
      'import React from "react";',
      "",
      "function Greet(props) {",
      "    return props.name;",
      "}",
    ].join("\n"),
  },
  {
    name: "blank lines are preserved without trailing whitespace",
    input: ["def foo():", "  x = 1", "", "  return x"].join("\n"),
    expected: ["def foo():", "    x = 1", "", "    return x"].join("\n"),
  },
];

const markdownCases = [
  {
    name: "prose mentioning 'class Rectangle' is left untouched, not wrapped as code",
    input:
      "The class Rectangle has four sides and two pairs of equal-length edges.",
    expected:
      "The class Rectangle has four sides and two pairs of equal-length edges.",
  },
  {
    name: "prose describing inheritance ('class X extends Y') without a body is left untouched",
    input: "Recall that the class Rectangle extends the abstract Shape class.",
    expected:
      "Recall that the class Rectangle extends the abstract Shape class.",
  },
  {
    name: "a real unfenced class declaration is still detected and wrapped",
    input: [
      "What does this program print?",
      "",
      "class Rectangle extends Shape {",
      "  int area() {",
      "    return width * height;",
      "  }",
      "}",
    ].join("\n"),
    expected: [
      "What does this program print?",
      "",
      "```java",
      "class Rectangle extends Shape {",
      "    int area() {",
      "        return width * height;",
      "    }",
      "}",
      "```",
    ].join("\n"),
  },
];

let failures = 0;

for (const { name, input, expected } of cases) {
  const actual = autoIndentCode(input);
  if (actual === expected) {
    console.log(`ok   - ${name}`);
  } else {
    failures++;
    console.log(`FAIL - ${name}`);
    console.log("  --- expected ---");
    console.log(
      expected
        .split("\n")
        .map((l) => `  ${JSON.stringify(l)}`)
        .join("\n"),
    );
    console.log("  --- actual ---");
    console.log(
      actual
        .split("\n")
        .map((l) => `  ${JSON.stringify(l)}`)
        .join("\n"),
    );
  }
}

for (const { name, input, expected } of markdownCases) {
  const actual = autoIndentMarkdown(input);
  if (actual === expected) {
    console.log(`ok   - ${name}`);
  } else {
    failures++;
    console.log(`FAIL - ${name}`);
    console.log(`  expected: ${JSON.stringify(expected)}`);
    console.log(`  actual:   ${JSON.stringify(actual)}`);
  }
}

const total = cases.length + markdownCases.length;
console.log("");
console.log(`${total - failures}/${total} passed.`);

if (failures > 0) {
  process.exitCode = 1;
}
