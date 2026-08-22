// Splits raw question/explanation text into an ordered list of segments
// for the editable "Formatted" view in QuestionForm.jsx:
//   { type: "code", raw } for each fenced code block - raw includes the
//   ```lang\n...\n``` fences themselves, not just the body
//   { type: "text", raw } for everything between them - prose, which may
//   itself contain a GFM table, headings, or inline math; CodeText.jsx
//   already knows how to render all of that from a single string, so a
//   "text" segment is never split any further here
//
// Reconstructing the original string is always
// `segments.map(s => s.raw).join("")` - every segment.raw is a literal,
// untouched slice of the input, never reformatted or re-derived, so
// toggling between raw and formatted views can never silently rewrite
// text the user hasn't actually touched. This is deliberately NOT built
// on textBlocks.js#splitIntoTextBlocks, which trims and re-splits table
// cells for rendering and would lose that round-trip guarantee - it's
// still used (via CodeText) for the READ-only rendering of a "text"
// segment, just never for reconstructing the raw source.
//
// Describes the same fence shape as CodeText.jsx's own CODE_FENCE_RE
// (capture groups differ, matched spans don't) - if that pattern ever
// changes, this one needs to change with it or the two views can
// disagree about where a code block starts and ends.
export const CODE_FENCE_RE = /```\w*\n[\s\S]*?```/g;

export function splitIntoFormattedSegments(text) {
  const str = String(text ?? "");
  const segments = [];
  let cursor = 0;

  for (const match of str.matchAll(CODE_FENCE_RE)) {
    const start = match.index;
    const end = start + match[0].length;
    if (start > cursor) {
      segments.push({ type: "text", raw: str.slice(cursor, start) });
    }
    segments.push({ type: "code", raw: match[0] });
    cursor = end;
  }
  if (cursor < str.length || segments.length === 0) {
    segments.push({ type: "text", raw: str.slice(cursor) });
  }

  return segments;
}

// Display-only split of a code segment's raw fence text into its
// language tag and body. Never used for reconstruction - the textarea
// shown while editing a code segment always holds the full raw fence
// text, markers included, so editing the language tag or the fence
// structure itself both work like editing anything else.
export function parseCodeSegment(raw) {
  const match = /^```(\w*)\n([\s\S]*?)```$/.exec(raw);
  if (!match) return { language: null, body: raw };
  return { language: match[1] || null, body: match[2] };
}
