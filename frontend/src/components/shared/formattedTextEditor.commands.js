import { TextSelection } from "@tiptap/pm/state";

// Handles applying a heading/paragraph style to a selection that covers
// only PART of a single text block (e.g. one heading level for a
// sentence in the middle of a paragraph). TipTap's built-in
// setHeading/setParagraph commands only operate on whole blocks, so a
// partial selection needs the block split by hand into up to three
// blocks (before/selected/after), with the middle one retyped.
//
// Returns true if it handled the selection (the caller should stop
// there); false if the selection isn't a partial single-block selection,
// in which case the caller should fall through to the normal
// setHeading/setParagraph command.
export function applyPartialBlockTextStyle(editor, level) {
  const { selection } = editor.state;
  const { $from, $to } = selection;
  const isSinglePartialBlockSelection =
    selection.from !== selection.to &&
    $from.parent === $to.parent &&
    $from.parent.isTextblock &&
    (selection.from > $from.start() || selection.to < $to.end());

  if (!isSinglePartialBlockSelection) return false;

  const targetIsCurrentHeading = level && editor.isActive("heading", { level });
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
  return true;
}

// Inserts a new, empty math node at the current selection and selects it
// so MathNodeView opens its MathLive field immediately, letting the
// editor accept input right away instead of leaving a blank inert
// placeholder.
export function insertMathNode(editor) {
  if (!editor || !editor.isEditable) return;

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
}

// Inserts a new image node with a fresh, collision-proof slot key.
export function insertImageNode(editor) {
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
}
