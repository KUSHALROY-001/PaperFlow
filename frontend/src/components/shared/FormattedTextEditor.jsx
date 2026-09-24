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
import { markdownToDoc, docToMarkdown } from "@/utils/richTextDoc";
import { buildEditorExtensions, sizingClassName } from "./formattedTextEditor.extensions";
import {
  applyPartialBlockTextStyle,
  insertImageNode,
  insertMathNode,
} from "./formattedTextEditor.commands";
import { useSelectionPreservingCommand } from "./useSelectionPreservingCommand";
import { FormattedTextEditorToolbar } from "./FormattedTextEditorToolbar";

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
//
// This file is the orchestration layer only: TipTap setup, sync with the
// controlled `value` prop, and the imperative ref API. The extension/
// schema config lives in formattedTextEditor.extensions.js, the
// ProseMirror-only command logic (heading-split, math/image insertion)
// in formattedTextEditor.commands.js, the selection-preserving command
// wrapper in useSelectionPreservingCommand.js, and the toolbar's JSX in
// FormattedTextEditorToolbar.jsx - split out once this file grew past the
// point where the mix of concerns made any one of them hard to find.
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
    extensions: buildEditorExtensions(),
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

  const runWithSelectionPreserved = useSelectionPreservingCommand(editor, disabled);

  const applyTextStyle = useCallback(
    (level) => {
      if (!editor || disabled) return;

      if (applyPartialBlockTextStyle(editor, level)) return;

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
        insertMathNode(editor);
      },
      insertImage() {
        insertImageNode(editor);
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
        <FormattedTextEditorToolbar
          editor={editor}
          disabled={disabled}
          runCommand={runCommand}
          textStyle={textStyle}
          setTextStyle={setTextStyle}
          isStyleMenuOpen={isStyleMenuOpen}
          setIsStyleMenuOpen={setIsStyleMenuOpen}
          styleMenuRef={styleMenuRef}
        />
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
