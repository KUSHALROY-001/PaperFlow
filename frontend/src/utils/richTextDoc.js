import { Schema, Node as ProseMirrorNode } from "@tiptap/pm/model";
import { MarkdownSerializer } from "prosemirror-markdown";
import { splitIntoTextBlocks } from "./textBlocks.js";

// Converts between this app's raw markdown-ish question/explanation text
// (the format stored in the DB and read everywhere else - MathText.jsx,
// CodeText.jsx, the worker, PDF export) and a TipTap/ProseMirror
// document, for the rich-text Formatted editor in
// FormattedTextEditor.jsx.
//
// Every raw line becomes a paragraph or heading block. This lets the
// formatted editor apply Heading 1-3 to the current line while retaining
// the app's simple, newline-based stored markdown representation.
//
// Fenced code and GFM tables are represented as real block nodes. The
// saved format remains the existing Markdown text, which keeps the PDF
// export and read-only question surfaces compatible.
//
// docToMarkdown uses prosemirror-markdown's MarkdownSerializer rather
// than a hand-rolled string-concatenation walk. That's not a style
// preference - an earlier hand-rolled version of this file passed
// simple cases but silently produced WRONG output for adjacent runs
// with overlapping marks (e.g. "**bold *and italic* inside**" came back
// as "**bold ****and italic**** inside**" - each leaf token wrapped
// independently instead of the shared outer mark being recognized and
// wrapped once). MarkdownSerializer's `mixable` mark handling is the
// established, tested solution to exactly that problem - see
// richTextDoc.selftest.js for the regression cases (including that one)
// this is checked against.
//
// THE RULE THIS FILE MUST NEVER BREAK: docToMarkdown(markdownToDoc(x))
// must equal x, for every x this app can actually produce. Unlike
// textHighlight.jsx's old overlay approach, a mismatch here isn't just
// visually confusing - since ProseMirror redraws the DOM from this
// document on every change, anything this serializer drops or mangles
// is gone from what the user sees and edits from that point on.

const MATH_TOKEN_RE =
  /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\n$]+?\$|\\\([\s\S]+?\\\)|(?<!\$)\$\$(?!\$)|!\[\[img:[a-z0-9][a-z0-9-]{0,63}\]\])/g;

const IMAGE_MARKER_RE = /^!\[\[img:([a-z0-9][a-z0-9-]{0,63})\]\]$/;

const INLINE_MARKERS = [
  { open: "***", close: "***", marks: ["bold", "italic"] },
  { open: "**", close: "**", marks: ["bold"] },
  { open: "~~", close: "~~", marks: ["strike"] },
  { open: "<u>", close: "</u>", marks: ["underline"] },
  { open: "*", close: "*", marks: ["italic"] },
];

// The schema is intentionally minimal and lives only here + in the real
// TipTap extension config (FormattedTextEditor.jsx) - the two must
// agree on node/mark names, but this file has no dependency on TipTap
// itself, so its round-trip correctness can be (and is, in
// richTextDoc.selftest.js) verified with plain prosemirror-model/
// prosemirror-markdown, no React or browser needed.
export const docSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    heading: {
      content: "inline*",
      group: "block",
      attrs: { level: { default: 1 } },
    },
    codeBlock: {
      content: "text*",
      group: "block",
      code: true,
      attrs: { language: { default: null } },
    },
    table: { content: "tableRow+", group: "block" },
    tableRow: { content: "(tableCell | tableHeader)*" },
    tableCell: {
      content: "block+",
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        colwidth: { default: null },
      },
    },
    tableHeader: {
      content: "block+",
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        colwidth: { default: null },
      },
    },
    text: { group: "inline" },
    // Named "hardBreak" (not the more conventional snake_case
    // "hard_break") because that's the actual node name TipTap's own
    // HardBreak extension uses internally (@tiptap/extension-hard-break,
    // bundled via StarterKit in FormattedTextEditor.jsx) - this schema
    // has to match the real editor's schema exactly, node name included,
    // or a doc round-tripped through the live editor would silently stop
    // matching what this file validates.
    hardBreak: { inline: true, group: "inline" },
    math: {
      inline: true,
      group: "inline",
      atom: true,
      attrs: { latex: { default: "" }, displayMode: { default: false } },
      // TipTap's own attribute-parsing/rendering config lives on the
      // Node extension in FormattedTextEditor.jsx, not here - this
      // schema exists purely for the plain prosemirror-model
      // validation richTextDoc.selftest.js does, and to construct the
      // MarkdownSerializer below.
    },
    image: {
      inline: true,
      group: "inline",
      atom: true,
      attrs: { slotKey: { default: "default" } },
    },
  },
  marks: {
    bold: {},
    italic: {},
    underline: {},
    strike: {},
  },
});

const markdownSerializer = new MarkdownSerializer(
  {
    paragraph(state, node) {
      state.renderInline(node);
      state.write("\n");
    },
    heading(state, node) {
      state.write(`${"#".repeat(node.attrs.level)} `);
      state.renderInline(node);
      state.write("\n");
    },
    codeBlock(state, node) {
      state.write(`\`\`\`${node.attrs.language || ""}\n`);
      state.write(node.textContent);
      state.write("\n```\n");
    },
    table(state, node) {
      const renderCell = (cell) => {
        let rendered = "";
        cell.forEach((block) => {
          const outputStart = state.out.length;
          state.renderInline(block);
          rendered += state.out.slice(outputStart);
          state.out = state.out.slice(0, outputStart);
        });
        return rendered.replace(/\n/g, "<br>");
      };
      const rows = [];
      node.forEach((row) => {
        const cells = [];
        row.forEach((cell) => cells.push(renderCell(cell)));
        rows.push(cells);
      });
      if (!rows.length) return;

      let colWidthsComment = "";
      const firstRow = node.firstChild;
      if (firstRow) {
        const colWidths = [];
        firstRow.forEach((cell) => {
          if (cell.attrs.colwidth && cell.attrs.colwidth.length) {
            colWidths.push(cell.attrs.colwidth[0]);
          }
        });
        if (colWidths.length === rows[0].length) {
          const total = colWidths.reduce((a, b) => a + b, 0);
          if (total > 0) {
            const percents = colWidths.map(
              (w) => `${Math.round((w / total) * 100)}%`,
            );
            colWidthsComment = ` <!-- colwidths: ${percents.join(", ")} -->`;
          }
        }
      }

      state.write(`| ${rows[0].join(" | ")} |${colWidthsComment}\n`);
      state.write(`| ${rows[0].map(() => "---").join(" | ")} |\n`);
      rows.slice(1).forEach((cells) => {
        state.write(`| ${cells.join(" | ")} |\n`);
      });
    },
    hardBreak(state) {
      state.write("\n");
    },
    math(state, node) {
      const { latex, displayMode } = node.attrs;
      state.write(displayMode ? `$$${latex}$$` : `$${latex}$`);
    },
    image(state, node) {
      state.write(`![[img:${node.attrs.slotKey}]]`);
    },
    text(state, node) {
      // escape=false: this app's parser (below) has no concept of
      // backslash-escaped literal markup characters, so emitting `\*`
      // for a literal "*" would round-trip WRONG (the parser would
      // leave the backslash in place rather than stripping it back to
      // a plain "*"). A lone, unpaired "*"/"**" etc. in plain text
      // already falls back to literal output in parseInline below, so
      // escaping isn't needed for safety here the way it would be for
      // full CommonMark.
      state.text(node.text, false);
    },
  },
  {
    bold: {
      open: "**",
      close: "**",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    italic: {
      open: "*",
      close: "*",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    strike: {
      open: "~~",
      close: "~~",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    underline: {
      open: "<u>",
      close: "</u>",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
  },
  { hardBreakNodeName: "hardBreak" },
);

function mathAttrsFromToken(token) {
  // `$$` is the serialized form of a newly inserted empty inline
  // formula. It must come back as an inline math node, not as an empty
  // display formula or literal text, so old transient saves recover to
  // the same MathLive editing experience.
  if (token === "$$") return { latex: "", displayMode: false };

  const isDisplay = token.startsWith("$$") || token.startsWith(String.raw`\[`);
  const inner = isDisplay ? token.slice(2, -2) : token.slice(1, -1);
  return { latex: inner, displayMode: isDisplay };
}

function findClosing(text, start, open) {
  if (open === "*") {
    // A lone "*" only closes when it isn't itself part of a "**"/"***"
    // run - mirrors textHighlight.jsx/MathText.jsx's identical rule, so
    // every parser in this app agrees on where markers start and end.
    for (let i = start; i < text.length; i += 1) {
      if (text[i] !== "*") continue;
      if (text[i - 1] === "*" || text[i + 1] === "*") continue;
      return i;
    }
    return -1;
  }
  const close = INLINE_MARKERS.find((m) => m.open === open).close;
  return text.indexOf(close, start);
}

function pushTextWithBreaks(text, marks, tokens) {
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (line) tokens.push({ text: line, marks });
    if (index < lines.length - 1) tokens.push({ hardBreak: true });
  });
}

function parseInline(text, activeMarks, tokens) {
  let cursor = 0;

  while (cursor < text.length) {
    const marker = INLINE_MARKERS.find(({ open }) =>
      text.startsWith(open, cursor),
    );

    if (!marker) {
      const nextOpen = INLINE_MARKERS.map(({ open }) =>
        text.indexOf(open, cursor + 1),
      ).filter((pos) => pos !== -1);
      const plainEnd = nextOpen.length ? Math.min(...nextOpen) : text.length;
      pushTextWithBreaks(text.slice(cursor, plainEnd), activeMarks, tokens);
      cursor = plainEnd;
      continue;
    }

    const contentStart = cursor + marker.open.length;
    const closeAt = findClosing(text, contentStart, marker.open);

    if (closeAt === -1) {
      // Unclosed marker - keep the literal characters as plain text,
      // same fallback textHighlight.jsx/MathText.jsx use.
      pushTextWithBreaks(marker.open, activeMarks, tokens);
      cursor = contentStart;
      continue;
    }

    parseInline(
      text.slice(contentStart, closeAt),
      [...new Set([...activeMarks, ...marker.marks])],
      tokens,
    );
    cursor = closeAt + marker.close.length;
  }
}

function parseSegment(text, tokens) {
  text.split(MATH_TOKEN_RE).forEach((chunk, index) => {
    if (!chunk) return;
    if (index % 2 === 1) {
      const image = chunk.match(IMAGE_MARKER_RE);
      if (image) tokens.push({ image: true, slotKey: image[1] });
      else tokens.push({ math: true, ...mathAttrsFromToken(chunk) });
    } else {
      parseInline(chunk, [], tokens);
    }
  });
}

function inlineContent(text) {
  const tokens = [];
  parseSegment(text, tokens);
  return tokens.map((token) => {
    if (token.hardBreak) return { type: "hardBreak" };
    if (token.math) {
      return {
        type: "math",
        attrs: { latex: token.latex, displayMode: token.displayMode },
      };
    }
    if (token.image) {
      return { type: "image", attrs: { slotKey: token.slotKey } };
    }
    return {
      type: "text",
      text: token.text,
      ...(token.marks.length
        ? { marks: token.marks.map((type) => ({ type })) }
        : {}),
    };
  });
}

function paragraphOrHeading(line) {
  const heading = line.match(/^(#{1,3})\s+(.*)$/);
  const text = heading ? heading[2] : line;
  const inline = inlineContent(text);

  return {
    type: heading ? "heading" : "paragraph",
    ...(heading ? { attrs: { level: heading[1].length } } : {}),
    ...(inline.length ? { content: inline } : {}),
  };
}

function tableCell(text, type, colwidth = null) {
  return {
    type,
    attrs: {
      colspan: 1,
      rowspan: 1,
      colwidth: colwidth != null ? [colwidth] : null,
    },
    content: [paragraphOrHeading(text)],
  };
}

function tableBlock({ header, rows, colWidths }) {
  const columnCount = Math.max(
    header.length,
    ...rows.map((row) => row.length),
    0,
  );
  const normalizeRow = (cells) =>
    Array.from({ length: columnCount }, (_, index) => cells[index] || "");

  const parsedWidths =
    Array.isArray(colWidths) && colWidths.length === columnCount
      ? colWidths.map((w) => {
          const num = Number(String(w).replace("%", ""));
          return Number.isFinite(num) ? Math.round(num * 6) : null;
        })
      : null;

  return {
    type: "table",
    content: [
      {
        type: "tableRow",
        content: normalizeRow(header).map((cell, i) =>
          tableCell(cell, "tableHeader", parsedWidths?.[i]),
        ),
      },
      ...rows.map((row) => ({
        type: "tableRow",
        content: normalizeRow(row).map((cell, i) =>
          tableCell(cell, "tableCell", parsedWidths?.[i]),
        ),
      })),
    ],
  };
}

function appendProseBlocks(text, content) {
  splitIntoTextBlocks(text).forEach((block) => {
    if (block.type === "table") {
      content.push(tableBlock(block));
      return;
    }

    block.content.split("\n").forEach((line) => {
      content.push(paragraphOrHeading(line));
    });
  });
}

export function markdownToDoc(markdown) {
  const lines = String(markdown ?? "").split("\n");
  const content = [];
  const prose = [];
  const flushProse = () => {
    if (!prose.length) return;
    appendProseBlocks(prose.join("\n"), content);
    prose.length = 0;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const openingFence = lines[index].match(/^```([^`]*)$/);
    if (!openingFence) {
      prose.push(lines[index]);
      continue;
    }

    const closingIndex = lines.findIndex(
      (line, lineIndex) => lineIndex > index && /^```\s*$/.test(line),
    );
    if (closingIndex === -1) {
      prose.push(lines[index]);
      continue;
    }

    flushProse();
    const code = lines.slice(index + 1, closingIndex).join("\n");
    content.push({
      type: "codeBlock",
      attrs: { language: openingFence[1].trim() || null },
      ...(code ? { content: [{ type: "text", text: code }] } : {}),
    });
    index = closingIndex;
  }

  flushProse();
  return { type: "doc", content: content.length ? content : [paragraphOrHeading("")] };
}

export function docToMarkdown(docJSON) {
  const doc = ProseMirrorNode.fromJSON(docSchema, docJSON);
  return markdownSerializer
    .serialize(doc, { tightLists: true })
    .replace(/\n$/, "");
}
