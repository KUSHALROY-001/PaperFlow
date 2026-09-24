import { Node as TiptapNode } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { MathNode } from "./MathNode";
import { ImageNode } from "./ImageNode";

// The document shape mirrors richTextDoc.js: a sequence of paragraph and
// heading blocks, so the formatted editor can apply headings to a line.
export const FormattedDocument = TiptapNode.create({
  name: "doc",
  topNode: true,
  content: "block+",
});

export const sizingClassName =
  "min-h-12 px-4 py-3 text-xs sm:text-sm leading-relaxed rounded-xl border border-border bg-card text-foreground focus-within:ring-2 focus-within:ring-orange-500/30 transition-all";

// TipTap extension list for FormattedTextEditor. Pulled out of the
// component itself purely so the StarterKit/TableKit configuration -
// static, has no hooks or component state involved - doesn't crowd out
// the editor's actual runtime behavior when reading FormattedTextEditor.jsx.
export function buildEditorExtensions() {
  return [
    FormattedDocument,
    StarterKit.configure({
      document: false,
      blockquote: false,
      bulletList: false,
      code: false,
      codeBlock: {
        enableTabIndentation: true,
        tabSize: 4,
        HTMLAttributes: {
          class:
            "my-3 overflow-x-auto rounded-xl border border-border bg-muted/60 p-3 font-mono text-xs sm:text-sm leading-relaxed",
        },
      },
      horizontalRule: false,
      link: false,
      listItem: false,
      listKeymap: false,
      orderedList: false,
      trailingNode: false,
    }),
    TableKit.configure({
      table: {
        renderWrapper: true,
        HTMLAttributes: {
          class: "my-3 w-full border-collapse text-xs sm:text-sm",
        },
      },
      tableHeader: {
        HTMLAttributes: {
          class:
            "border-b border-border bg-muted px-3 py-2 text-left font-bold text-foreground",
        },
      },
      tableCell: {
        HTMLAttributes: {
          class: "border-b border-border/60 px-3 py-2 align-top text-foreground",
        },
      },
    }),
    MathNode,
    ImageNode,
  ];
}
