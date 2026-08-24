// Standalone regression test for richTextDoc.js's markdown<->doc
// round-trip - no test framework is configured in this project, so this
// runs with plain `node`:
//
//   node src/utils/richTextDoc.selftest.mjs
//
// Needs @tiptap/pm and prosemirror-markdown on disk (both real
// dependencies of FormattedTextEditor.jsx - see package.json). Imports
// from @tiptap/pm/model specifically, not a separate prosemirror-model
// package, so this always validates against the exact ProseMirror
// instance the real editor uses. .mjs so it can run standalone via
// plain `node`, without Vite's JSX/alias resolution in the way -
// richTextDoc.js itself has no such requirement and is imported
// normally everywhere else in the app.
import { Node } from "@tiptap/pm/model";
import { docSchema, markdownToDoc, docToMarkdown } from "./richTextDoc.js";

const cases = [
  "Plain text with no markup at all.",
  "***What is the output of the following program ?***",
  "***<u>What is the output of the following program ?</u>***",
  "This has **bold**, *italic*, ~~strike~~, and <u>underline</u> together.",
  "Inline math $x^2 + y^2 = z^2$ in a sentence, and display $$\\int_0^1 x dx$$ too.",
  "An unclosed **bold marker with no close",
  "Price is $50 not math, but $x+y$ is math.",
  "",
  "Nested **bold *and italic* inside** text.",
  "nested underline <u>text with **bold** inside</u> end.",
  "Multiple\nline\nbreaks\nin\na\nrow.",
  "Let $z_{1}$, $z_{2}$ and $z_{3}$ be three complex numbers on the circle\n$|z| = 1$ with ${arg}(z_{1}) = -\\frac{\\pi}{4}$, ${arg}(z_{2})\n= 0$ and ${arg}(z_{3}) = \\frac{\\pi}{4}$. If $|z_{1}\\bar{z}_{2}\n+ z_{2}\\bar{z}_{3} + z_{3}\\bar{z}_{1}|^{2} = \\alpha +\n\\beta\\sqrt{2}$, $\\alpha, \\beta \\in \\mathbf{Z}$, then the value of\n$\\alpha^{2} + \\beta^{2}$ is :",
  "```c\n#include <stdio.h>\nint main() {\n    return 0;\n}\n```",
  "A trailing newline case\n",
  "$$\\alpha^{2} + \\beta^{2}$$ display math alone on a line",
  "5 * 3 = 15 with a single literal asterisk",
  "Compute $5 * 3$ inside math, safe since it's opaque LaTeX source.",
  "Unicode subscripts: x₁ + x₂ and emoji ✍️ in plain text.",
  "Tabs\tand   multiple   spaces preserved exactly.",
  "Consecutive bold blocks: **first** **second** **third**.",
  "**Bold at the very start of the string.",
  "String ending in bold**",
  "$$",
  "$$$$",
];

let failures = 0;
for (const input of cases) {
  let doc, docJSON, output, err = null;
  try {
    docJSON = markdownToDoc(input);
    doc = Node.fromJSON(docSchema, docJSON); // validate against real schema
    output = docToMarkdown(docJSON);
  } catch (e) {
    err = e;
  }
  const ok = !err && output === input;
  if (ok) {
    console.log("ok   -", JSON.stringify(input.slice(0, 55)));
  } else {
    failures++;
    console.log("FAIL -", JSON.stringify(input.slice(0, 80)));
    if (err) console.log("  error:", err.message);
    else {
      console.log("  expected:", JSON.stringify(input));
      console.log("  actual:  ", JSON.stringify(output));
    }
  }
}

const emptyMathDocument = markdownToDoc("$$");
const emptyMathNode = emptyMathDocument.content[0]?.content?.[0];
if (
  emptyMathNode?.type !== "math" ||
  emptyMathNode.attrs?.latex !== "" ||
  emptyMathNode.attrs?.displayMode !== false
) {
  failures++;
  console.log("FAIL - empty inline math was not reconstructed as a math node");
}

console.log(`\n${cases.length - failures}/${cases.length} passed.`);
process.exit(failures > 0 ? 1 : 0);
