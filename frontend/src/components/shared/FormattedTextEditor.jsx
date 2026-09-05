import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Node as TiptapNode } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import {
  Bold,
  ChevronDown,
  Italic,
  Strikethrough,
  Underline,
} from "lucide-react";
import { MathNode } from "./MathNode";
import { ImageNode } from "./ImageNode";
import { markdownToDoc, docToMarkdown } from "@/utils/richTextDoc";

// The document shape mirrors richTextDoc.js: a sequence of paragraph and
// heading blocks, so the formatted editor can apply headings to a line.
const FormattedDocument = TiptapNode.create({
  name: "doc",
  topNode: true,
  content: "block+",
});

const sizingClassName =
  "min-h-12 px-4 py-3 text-xs sm:text-sm leading-relaxed rounded-xl border border-border bg-card text-foreground focus-within:ring-2 focus-within:ring-orange-500/30 transition-all";

// The "Formatted" alternative to a plain <textarea> for Question Text /
// Explanation. Built on TipTap/ProseMirror rather than a hand-rolled
// contentEditable or textarea-plus-overlay - both earlier approaches hit
// real, confirmed failure modes (see FormattedTextEditor.jsx's git
// history / the PR discussion this came out of): a block-based
// click-to-edit design that reverted to raw markup the moment you
// started typing, and an invisible-textarea-plus-styled-overlay version
// that could desync the visible cursor from where characters actually
// landed once the content got dense enough. Both were attempts to solve
// "stay visually rendered while typing" without taking on a real
// editor's document-model/reconciliation machinery - ProseMirror IS
// that machinery, battle-tested in production across many editors, which
// is the actual reason to depend on it here rather than a smaller
// hand-rolled fix: cursor/selection tracking through arbitrary typing is
// precisely the hard problem it exists to solve correctly.
//
// Bold/italic/underline/strikethrough are ordinary ProseMirror marks -
// typed and edited completely natively, no custom logic needed. Math
// ($...$/$$...$$) is the one thing that can't be "typed into" while
// staying rendered (KaTeX output doesn't map back to its LaTeX source
// character-by-character) - see MathNode.jsx for how that's handled:
// rendered as a real atomic node, edited via an explicit click-to-open
// popover, never inline-typeable.
//
// Round-trip conversion to/from this app's raw markdown format lives in
// richTextDoc.js, verified there against 23 cases via a real ProseMirror
// schema (richTextDoc.selftest.mjs) - that's the part of this that could
// be checked without a browser. What could NOT be verified in this
// environment (no browser/DOM available while building this): actual
// click/typing/cursor behavior in a live browser, the math popover's
// interaction feel, and cross-browser rendering. That needs real
// interactive testing, not just this file compiling.
//
// Code fences and GFM tables are plain, unstyled text in this editor for
// now (not corrupted, just not specially rendered) - see richTextDoc.js.
function FormattedTextEditor(
  {
    value,
    onChange,
    disabled,
    placeholder,
    showToolbar = true,
    questionId,
    mockTestId,
  },
  ref,
) {
  // TipTap owns selection state outside React. Re-rendering on its
  // transactions lets the toolbar accurately show active marks without
  // making the document content React-controlled on every keystroke.
  const [, refreshToolbar] = useReducer((count) => count + 1, 0);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const styleMenuRef = useRef(null);
  const lastEmittedValueRef = useRef(value);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!styleMenuRef.current?.contains(event.target)) {
        setIsStyleMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const editor = useEditor({
    // React 19 forbids flushSync during render/lifecycle. TipTap's default
    // immediatelyRender path uses flushSync when mounting the editor (and
    // again when ReactNodeViewRenderer mounts ImageNode/MathNode views).
    immediatelyRender: false,
    extensions: [
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
            class:
              "border-b border-border/60 px-3 py-2 align-top text-foreground",
          },
        },
      }),
      MathNode,
      ImageNode,
    ],
    content: markdownToDoc(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: `${sizingClassName} focus:outline-none whitespace-pre-wrap break-words`,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      // A brand-new math node is deliberately empty until MathLive
      // receives the first keystroke. Serializing it as `$$` here would
      // feed that value back through markdownToDoc() and replace the
      // node with literal dollar signs before its node view can mount.
      // Keep the transient node local; the first MathLive input will
      // serialize normally, and abandoning it deletes the node.
      let containsEmptyMath = false;
      currentEditor.state.doc.descendants((node) => {
        if (node.type.name === "math" && !node.attrs.latex.trim()) {
          containsEmptyMath = true;
          return false;
        }
        return !containsEmptyMath;
      });
      if (containsEmptyMath) return;

      const nextValue = docToMarkdown(currentEditor.getJSON());
      lastEmittedValueRef.current = nextValue;
      onChange(nextValue);
    },
    onSelectionUpdate: () => refreshToolbar(),
    onTransaction: () => refreshToolbar(),
  });

  // Image node views resolve their upload target from editor storage. Keep
  // this in sync when the persistent editor is reused for another question.
  useEffect(() => {
    if (!editor) return;
    // TipTap extension storage is intentionally mutable shared state.
    // eslint-disable-next-line react-hooks/immutability
    editor.storage.image = { questionId, mockTestId };
  }, [editor, questionId, mockTestId]);

  const runWithSelectionPreserved = useCallback(
    (command) => {
      if (!editor || disabled) return false;

      const { from, to } = editor.state.selection;
      const hasTextRange = from !== to;
      const didRun = command(editor.chain().focus()).run();

      // Toolbar clicks must not make people select the same words again
      // before applying another mark or a heading. Mark/block commands do
      // not change document positions, so restoring this exact range is
      // safe and also covers option-menu commands invoked through the ref.
      if (didRun && hasTextRange) {
        editor.commands.setTextSelection({ from, to });
        // Parent state receives the serialized markdown on every update.
        // Restore once more after that controlled update settles; otherwise
        // some browsers collapse the highlight after the first toolbar click.
        requestAnimationFrame(() => {
          if (!editor.isDestroyed) {
            editor.commands.setTextSelection({ from, to });
          }
        });
      }

      return didRun;
    },
    [disabled, editor],
  );

  const applyTextStyle = useCallback(
    (level) => {
      if (!editor || disabled) return;

      const { selection } = editor.state;
      const { $from, $to } = selection;
      const isSinglePartialBlockSelection =
        selection.from !== selection.to &&
        $from.parent === $to.parent &&
        $from.parent.isTextblock &&
        (selection.from > $from.start() || selection.to < $to.end());

      if (isSinglePartialBlockSelection) {
        const targetIsCurrentHeading =
          level && editor.isActive("heading", { level });
        let targetType;
        if (targetIsCurrentHeading) {
          targetType = editor.schema.nodes.paragraph;
        } else if (level) {
          targetType = editor.schema.nodes.heading;
        } else {
          targetType = editor.schema.nodes.paragraph;
        }
        const selectedContent = $from.parent.content.cut(
          $from.parentOffset,
          $to.parentOffset,
        );
        const beforeContent = $from.parent.content.cut(0, $from.parentOffset);
        const afterContent = $from.parent.content.cut($to.parentOffset);
        const originalType = $from.parent.type;
        const originalAttrs = $from.parent.attrs;
        const blocks = [];

        if (beforeContent.size) {
          blocks.push(originalType.create(originalAttrs, beforeContent));
        }
        blocks.push(
          targetType.create(
            level && !targetIsCurrentHeading ? { level } : null,
            selectedContent,
          ),
        );
        if (afterContent.size) {
          blocks.push(originalType.create(originalAttrs, afterContent));
        }

        const blockStart = $from.before();
        const selectionStart =
          blockStart + (beforeContent.size ? blocks[0].nodeSize : 0) + 1;
        const transaction = editor.state.tr.replaceWith(
          blockStart,
          $from.after(),
          blocks,
        );
        transaction.setSelection(
          TextSelection.create(
            transaction.doc,
            selectionStart,
            selectionStart + selectedContent.size,
          ),
        );
        editor.view.dispatch(transaction.scrollIntoView());
        return;
      }

      if (!level || editor.isActive("heading", { level })) {
        runWithSelectionPreserved((chain) => chain.setParagraph());
      } else {
        runWithSelectionPreserved((chain) => chain.setHeading({ level }));
      }
    },
    [disabled, editor, runWithSelectionPreserved],
  );

  useImperativeHandle(
    ref,
    () => ({
      insertMath() {
        if (!editor || !editor.isEditable) return;

        // Keep the new empty formula selected so MathNodeView opens its
        // MathLive field immediately. The editor can then accept input
        // straight away instead of leaving a blank inert placeholder.
        const position = editor.state.selection.from;
        editor
          .chain()
          .focus()
          .insertContent({
            type: "math",
            attrs: { latex: "", displayMode: false },
          })
          .setNodeSelection(position)
          .run();
      },
      insertImage() {
        if (!editor || !editor.isEditable) return;

        const usedSlotKeys = new Set();
        editor.state.doc.descendants((node) => {
          if (node.type.name === "image") usedSlotKeys.add(node.attrs.slotKey);
        });
        let slotKey;
        do {
          // crypto.randomUUID() rather than Math.random() (javascript:S2245) -
          // Math.random() isn't cryptographically strong; a UUID-derived
          // suffix keeps this collision-proof without that weakness.
          slotKey = `img-${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;
        } while (usedSlotKeys.has(slotKey));

        const position = editor.state.selection.from;
        editor
          .chain()
          .focus()
          .insertContent({ type: "image", attrs: { slotKey } })
          .setNodeSelection(position)
          .run();
      },
      toggleBold() {
        runWithSelectionPreserved((chain) => chain.toggleBold());
      },
      toggleItalic() {
        runWithSelectionPreserved((chain) => chain.toggleItalic());
      },
      toggleUnderline() {
        runWithSelectionPreserved((chain) => chain.toggleUnderline());
      },
      toggleStrike() {
        runWithSelectionPreserved((chain) => chain.toggleStrike());
      },
      setTextStyle(level) {
        applyTextStyle(level);
      },
    }),
    [applyTextStyle, editor, runWithSelectionPreserved],
  );

  // Only sync a value that came from outside this editor (switching
  // questions, applying Indent code, or cleanup). Re-parsing our own
  // emitted markdown can produce an equivalent but structurally
  // different document for code-fence text; setContent() then recreates
  // the editor and drops the caret at the final line on every keystroke.
  //
  // setContent is deferred with queueMicrotask so it does not run inside
  // React's passive-effect phase. TipTap's ReactNodeViewRenderer calls
  // flushSync when mounting ImageNode/MathNode views; doing that while
  // React is still committing effects triggers:
  //   "flushSync was called from inside a lifecycle method..."
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedValueRef.current) return;

    const nextDocument = markdownToDoc(value);
    const shouldReplace =
      JSON.stringify(editor.getJSON()) !== JSON.stringify(nextDocument);

    // Record the value we are applying so onUpdate / a fast re-render
    // does not treat this same string as a new external write.
    lastEmittedValueRef.current = value;

    if (!shouldReplace) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || editor.isDestroyed) return;
      // Skip if a newer external value already superseded this one.
      if (lastEmittedValueRef.current !== value) return;
      editor.commands.setContent(nextDocument, { emitUpdate: false });
    });

    return () => {
      cancelled = true;
    };
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  const runCommand = (command) => {
    runWithSelectionPreserved(command);
  };

  const toolButtonClassName = (isActive) => {
    let tone;
    if (disabled) {
      tone = "cursor-not-allowed text-muted-foreground/40";
    } else if (isActive) {
      tone = "bg-orange-500 text-white shadow-sm";
    } else {
      tone = "text-foreground hover:bg-muted";
    }
    return `flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${tone}`;
  };

  const textStyle = [1, 2, 3].find((level) =>
    editor.isActive("heading", { level }),
  );

  const setTextStyle = (level) => {
    applyTextStyle(level);
    setIsStyleMenuOpen(false);
  };

  return (
    <div className="relative">
      {showToolbar && (
        <div className="mb-2 flex flex-wrap items-center gap-1  border border-border bg-muted/40 p-1.5">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand((chain) => chain.toggleBold())}
            title="Bold (Ctrl+B)"
            className={toolButtonClassName(editor.isActive("bold"))}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand((chain) => chain.toggleItalic())}
            title="Italic (Ctrl+I)"
            className={toolButtonClassName(editor.isActive("italic"))}
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand((chain) => chain.toggleUnderline())}
            title="Underline"
            className={toolButtonClassName(editor.isActive("underline"))}
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand((chain) => chain.toggleStrike())}
            title="Strikethrough"
            className={toolButtonClassName(editor.isActive("strike"))}
          >
            <Strikethrough className="h-4 w-4" />
          </button>
          <div
            ref={styleMenuRef}
            className="relative ml-1 border-l border-border pl-1"
          >
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setIsStyleMenuOpen((open) => !open)}
              title="Text style"
              className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold transition-colors ${
                disabled
                  ? "cursor-not-allowed text-muted-foreground/40"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {textStyle ? `Heading ${textStyle}` : "Text"}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {isStyleMenuOpen && !disabled && (
              <div className="absolute left-0 top-10 z-20 min-w-40 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl">
                {[
                  { label: "Text", level: null },
                  { label: "Heading 1", level: 1 },
                  { label: "Heading 2", level: 2 },
                  { label: "Heading 3", level: 3 },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.label}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setTextStyle(item.level)}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                      textStyle === item.level
                        ? "bg-muted font-bold text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="relative">
        <EditorContent editor={editor} />
        {!value && (
          <div className="pointer-events-none absolute left-4 top-3 text-xs sm:text-sm text-muted-foreground">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

export default forwardRef(FormattedTextEditor);
