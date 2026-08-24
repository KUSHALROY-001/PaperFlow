import { useCallback, useEffect, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import katex from "katex";
// Side-effect import: registers the <math-field> custom element globally
// (customElements.define("math-field", ...)) the first time this module
// loads. ES module imports are cached, so this is safe even though
// MathNodeView can mount many times (once per math expression on the
// page) - registration only ever happens once.
import "mathlive";

// Same rendering call/options as MathText.jsx's renderMath - kept
// identical deliberately, so a formula looks pixel-identical here and
// in the read-only Live Preview WHILE NOT being edited. This is only
// used for the non-editing display below - the moment you click into a
// formula, MathLive's own renderer takes over for that one expression
// (see the file comment on MathNodeView).
function renderMath(expr, displayMode) {
  try {
    return katex.renderToString(expr, {
      throwOnError: false,
      displayMode,
      strict: "ignore",
    });
  } catch {
    return expr;
  }
}

// Replaced an earlier version of this file where clicking a formula
// opened a plain <input> showing raw LaTeX source - technically safe,
// but not what "click into the math and edit it" is supposed to feel
// like (confirmed against a Word equation-editor screenshot). KaTeX
// itself can't provide that - it's a render-only library with zero
// editing capability - so the actual editing surface is now MathLive's
// <math-field> web component (https://cortexjs.io/mathlive), which is
// built specifically for this: clicking into it places a real cursor
// inside the rendered structure (numerator/denominator, exponents,
// etc.), navigable with arrow keys, not a separate text box next to the
// rendered output.
//
// Kept as a two-state node (rendered display vs. an active math-field),
// same shape as before, rather than mounting a live math-field for
// EVERY formula in the document all the time: only the one you're
// actively editing needs to be an interactive widget, and the
// non-editing display stays on plain katex.renderToString, which is
// both lighter-weight for a question with many formulas and guarantees
// pixel parity with Live Preview stays exact for anything not currently
// being edited.
//
// math-field is a Custom Element with real internal state of its own
// (its LaTeX value, cursor position, undo stack) - it's driven
// IMPERATIVELY via a ref (setting .value, calling .focus()) rather than
// through JSX props. That's the standard, safe way to integrate a Custom
// Element with meaningful internal state into React: JSX props on a
// custom element become DOM attributes, which isn't a reliable channel
// for a non-string value like this, and fighting that with declarative
// re-renders on every keystroke would be working against the element's
// own state management instead of with it.
function MathNodeView({ node, updateAttributes, editor, getPos, selected }) {
  const [isEditing, setIsEditing] = useState(false);
  const fieldRef = useRef(null);
  const startingLatexRef = useRef(node.attrs.latex);

  const openEditor = () => {
    startingLatexRef.current = node.attrs.latex;
    setIsEditing(true);
  };

  const removeEmptyNode = useCallback(() => {
    const position = getPos();
    if (typeof position !== "number") return;

    editor
      .chain()
      .focus()
      .deleteRange({ from: position, to: position + node.nodeSize })
      .run();
  }, [editor, getPos, node.nodeSize]);

  useEffect(() => {
    if (isEditing && fieldRef.current) {
      fieldRef.current.value = node.attrs.latex;
      // Autofocus needs a tick - the math-field isn't in the DOM yet on
      // the render that flips isEditing to true.
      requestAnimationFrame(() => fieldRef.current?.focus());
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  // FormattedTextEditor.jsx's insertMath() inserts a brand-new, empty
  // math node and selects it as a ProseMirror NodeSelection (rather than
  // leaving the cursor after it) specifically so this fires: "Insert
  // math" should produce an immediately-typeable empty box, not inert
  // rendered (blank) content the user then has to separately click into.
  // `selected` here is ReactNodeViewRenderer's own tracking of whether
  // THIS node currently holds that NodeSelection - not a custom attribute,
  // so it never touches the document schema/serialization.
  //
  // The `!node.attrs.latex` guard means this only ever fires for an
  // EMPTY formula, never an existing one with real content - an existing
  // formula already opens via its own onClick handler below, which is
  // unrelated to this. One side effect: arrow-key-navigating onto an
  // existing but empty formula slot (ProseMirror's ordinary behavior
  // when moving over an atomic node) will also auto-open it - a
  // reasonable byproduct, not a bug, since there's nothing useful to see
  // in an empty formula's rendered (blank) state anyway.
  useEffect(() => {
    if (selected && !node.attrs.latex && !isEditing && editor.isEditable) {
      openEditor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field || !isEditing) return;

    // MathLive fires "input" on almost every keystroke (per its own
    // docs) - committing on each one matches how every other editable
    // surface in this app already behaves (the raw textarea, the rest
    // of this TipTap document), not just on blur.
    const handleInput = () => updateAttributes({ latex: field.value });

    // MathLive's virtual keyboard panel is created lazily and attached
    // to <body>, separately from the <math-field> itself - a documented
    // MathLive quirk (github.com/arnog/mathlive/issues/1115) is that
    // this attachment can dispatch a transient "blur" on the field
    // BEFORE MathLive hands focus back to it, even though the user never
    // actually left the field. Collapsing on that raw blur - which
    // unmounts the <math-field> outright, since isEditing flips back to
    // false - is exactly what made the keyboard "open for a fraction of
    // a second and instantly disappear": the field it belongs to no
    // longer exists by the time MathLive tries to restore focus to it.
    //
    // Deferring one tick and re-checking who actually holds focus lets a
    // real blur (the user genuinely clicked elsewhere) still collapse
    // the field effectively immediately, while a spurious
    // virtual-keyboard blur self-corrects (focus returns to the field)
    // before this ever runs.
    let pendingBlurId = null;
    const handleBlur = () => {
      pendingBlurId = window.setTimeout(() => {
        pendingBlurId = null;
        if (document.activeElement === field) return;

        // A fresh formula that the user leaves blank is a cancelled
        // insertion, not content. Removing its atom keeps the raw value
        // clean instead of serializing it as an empty `$ $` / `$$ $$`.
        if (!field.value.trim()) {
          removeEmptyNode();
          return;
        }

        updateAttributes({ latex: field.value });
        setIsEditing(false);
      }, 0);
    };
    // Covers the case where focus returns to the field before the
    // deferred check above even runs - cancel the pending collapse
    // outright rather than relying solely on the activeElement check.
    const handleFocus = () => {
      if (pendingBlurId !== null) {
        window.clearTimeout(pendingBlurId);
        pendingBlurId = null;
      }
    };

    field.addEventListener("input", handleInput);
    field.addEventListener("blur", handleBlur);
    field.addEventListener("focus", handleFocus);
    return () => {
      field.removeEventListener("input", handleInput);
      field.removeEventListener("blur", handleBlur);
      field.removeEventListener("focus", handleFocus);
      if (pendingBlurId !== null) window.clearTimeout(pendingBlurId);
    };
  }, [isEditing, updateAttributes, removeEmptyNode]);

  const html = renderMath(node.attrs.latex || "", node.attrs.displayMode);

  return (
    <NodeViewWrapper
      as={node.attrs.displayMode ? "div" : "span"}
      className={`relative ${node.attrs.displayMode ? "block my-1" : "inline-block"}`}
    >
      {isEditing ? (
        <span className="inline-flex items-center rounded-md border border-orange-500/50 bg-card px-1 py-0.5 shadow-sm align-middle">
          <math-field
            ref={fieldRef}
            style={{ minWidth: "3rem", fontSize: "1.5em" }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                // Revert to whatever it was when editing started - not
                // just visually resetting the field, but explicitly
                // committing that value back, since every keystroke up
                // to this point already committed live via the "input"
                // listener above.
                updateAttributes({ latex: startingLatexRef.current });
                setIsEditing(false);
              }
            }}
          />
        </span>
      ) : (
        <span
          role="button"
          tabIndex={editor.isEditable ? 0 : -1}
          onClick={() => editor.isEditable && openEditor()}
          onKeyDown={(e) => {
            if (editor.isEditable && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              openEditor();
            }
          }}
          title={editor.isEditable ? "Click to edit this formula" : undefined}
          className={`rounded px-0.5 align-middle ${
            editor.isEditable ? "cursor-pointer hover:bg-orange-500/10" : ""
          } ${selected ? "ring-2 ring-orange-500/40" : ""}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </NodeViewWrapper>
  );
}

// An ATOMIC inline node (atom: true - ProseMirror treats its contents as
// opaque, not directly editable text) is what makes real KaTeX/MathLive
// rendering safe to embed at all: normal text nodes around it are edited
// completely natively by ProseMirror, while this node's own LaTeX source
// is only ever touched through the math-field widget above.
export const MathNode = Node.create({
  name: "math",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: { default: "" },
      displayMode: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "math" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },
});
