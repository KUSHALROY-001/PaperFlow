import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Crop, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { api, resolveAssetUrl } from "@/lib/api";
import { useDiagramAssets } from "@/lib/diagramAssetsContext";
import DiagramCropModal from "../question-editor/DiagramCropModal";

const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024;
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp";

// Mirrors MathNode.jsx's two-state shape (a lightweight display vs. an
// active widget only the node currently being worked on mounts) for the
// same reason: most images on a page are never being touched at any given
// moment, so only the one actually open needs upload/delete/crop controls -
// every other slot just shows its resolved thumbnail via
// DiagramAssetsContext (the SAME context QuestionPreviewCard/MathText
// already read from - this node isn't a separate image system, it's the
// editable counterpart of the exact same ![[img:slot_key]] marker
// MathText.jsx resolves everywhere else in the app).
//
// Unlike MathNode's math-field, there's no live "editing" of the image
// itself here - a slot_key's actual pixels only ever change through a
// real upload/crop round-trip to Cloudinary, not local, in-memory edits.
// So "open" here means "the small upload/replace/crop/remove control is
// visible", not "actively typing into this node" - closer to how
// DiagramUploadControl.jsx works for the default diagram slot, just
// inline at the marker's own position instead of pinned below the text.
function ImageNodeView({
  node,
  editor,
  getPos,
  questionId,
  mockTestId,
  selected,
}) {
  const { slotKey } = node.attrs;
  const queryClient = useQueryClient();
  const assets = useDiagramAssets();
  const asset = assets?.[slotKey];

  const [isOpen, setIsOpen] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const busy = isUploading || isDeleting;
  const canEdit = Boolean(editor.isEditable && questionId);

  const invalidateQuestions = () =>
    queryClient.invalidateQueries({ queryKey: ["questions", mockTestId] });

  // A freshly-inserted node (see FormattedTextEditor.jsx#insertImage)
  // has no asset for its brand-new slot_key yet - opening its own upload
  // control immediately, same as MathNode auto-opening its math-field for
  // a fresh empty formula (same useEffect-on-`selected` pattern, for the
  // same reason), means "Insert Image" produces an immediately actionable
  // prompt rather than an inert, invisible marker the user then has to
  // separately click to discover.
  useEffect(() => {
    if (selected && !asset && !isOpen && editor.isEditable) {
      setIsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const removeNode = () => {
    const position = getPos();
    if (typeof position !== "number") return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: position, to: position + node.nodeSize })
      .run();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Images must be 6MB or smaller");
      return;
    }

    setError("");
    setIsUploading(true);
    try {
      await api.uploadDiagramImage(questionId, file, slotKey);
      await invalidateQuestions();
      setIsOpen(false);
    } catch (uploadError) {
      setError(uploadError.message || "Could not upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteDiagramImage(questionId, slotKey);
      await invalidateQuestions();
      // The marker text itself is left in place after deleting the
      // asset - same "content and its image are two separate things"
      // stance the rest of this app takes. Removing the MARKER itself
      // is a separate, explicit action (Delete marker below), not an
      // automatic side effect of clearing the image.
    } catch (deleteError) {
      setError(deleteError.message || "Could not remove image");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <NodeViewWrapper
      as="span"
      // data-drag-handle + draggable:true on the Node (below) lets the
      // user grab this image and drop it elsewhere in the question text -
      // ProseMirror moves the atom node as a unit and surrounding text
      // reflows, same model Word uses for an inline picture.
      data-drag-handle
      className="relative inline-block align-middle"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileChange}
      />

      {asset && !isOpen ? (
        <span
          role="button"
          tabIndex={canEdit ? 0 : -1}
          onClick={() => canEdit && setIsOpen(true)}
          onKeyDown={(e) => {
            if (canEdit && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          title={
            canEdit
              ? `Drag to move · click to manage (${slotKey})`
              : undefined
          }
          className={`inline-block rounded-lg ${
            canEdit ? "cursor-grab active:cursor-grabbing" : ""
          } ${selected ? "ring-2 ring-orange-500/40" : ""}`}
        >
          <img
            src={resolveAssetUrl(asset.url)}
            alt=""
            draggable={false}
            className="max-h-40 max-w-full rounded-lg border border-border pointer-events-none"
          />
        </span>
      ) : (
        <span
          className={`inline-flex flex-col gap-1.5 rounded-lg border p-2 align-middle text-xs ${
            selected
              ? "border-orange-500/50 bg-orange-500/5"
              : "border-dashed border-border bg-muted/40"
          }`}
        >
          <span className="flex items-center gap-2">
            {asset && (
              <img
                src={resolveAssetUrl(asset.url)}
                alt=""
                className="h-10 w-10 rounded-md border border-border object-cover"
              />
            )}
            <span className="flex flex-col">
              <span className="font-mono text-[11px] text-muted-foreground">
                img:{slotKey}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {canEdit && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 font-bold text-orange-500 hover:underline disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3 w-3" />
                    )}
                    {asset ? "Replace" : "Upload"}
                  </button>
                )}
                {canEdit && asset && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setIsCropOpen(true)}
                    className="inline-flex items-center gap-1 font-bold text-orange-500 hover:underline disabled:opacity-50"
                    title="Crop this image"
                  >
                    <Crop className="h-3 w-3" />
                    Crop
                  </button>
                )}
                {canEdit && asset && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1 font-bold text-red-500 hover:underline disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Clear
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={removeNode}
                    className="font-bold text-muted-foreground hover:text-foreground hover:underline"
                    title="Remove this image marker from the text entirely"
                  >
                    Delete marker
                  </button>
                )}
                {asset && (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="font-bold text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Done
                  </button>
                )}
              </span>
            </span>
          </span>
          {error && <span className="text-red-500">{error}</span>}
        </span>
      )}

      {isCropOpen && asset && questionId && (
        <DiagramCropModal
          questionId={questionId}
          mockTestId={mockTestId}
          diagramUrl={asset.url}
          slotKey={slotKey}
          onClose={() => setIsCropOpen(false)}
        />
      )}
    </NodeViewWrapper>
  );
}

// An ATOMIC inline node (atom: true), same reasoning MathNode.jsx uses:
// ProseMirror treats its contents as opaque, so the surrounding text is
// edited completely natively while this node's own image is only ever
// touched through the upload/crop controls above - never by typing into it.
//
// slotKey is the ONLY attribute (no image data lives in the document
// itself - the actual bytes are in Cloudinary, keyed by questionId+
// slotKey, resolved for display via DiagramAssetsContext). This mirrors
// how question_contents.options never embedded image bytes either - the
// document just carries a stable reference, same "text is small and
// portable, media lives elsewhere" split this app already uses
// everywhere else images appear.
export const ImageNode = Node.create({
  name: "image",
  group: "inline",
  inline: true,
  atom: true,
  // Native ProseMirror node drag - drop the image at a new caret
  // position and the ![[img:slot]] marker moves with it. Text reflows
  // because the node stays an ordinary inline atom in the doc.
  draggable: true,

  addAttributes() {
    return {
      slotKey: { default: "default" },
    };
  },

  // questionId/mockTestId aren't node attrs (see addNodeView's own
  // comment on why) - they live here instead, set once by
  // FormattedTextEditor.jsx right after the editor is created, and read
  // by every ImageNodeView instance in the document via
  // props.editor.storage.image.
  addStorage() {
    return { questionId: null, mockTestId: null };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="image"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "image" })];
  },

  addNodeView() {
    // questionId/mockTestId come from the editor's own storage (set once
    // when FormattedTextEditor configures this extension - see
    // addOptions there) rather than as node attrs, for the same reason
    // MathNode never needed them at all: they're properties of WHICH
    // QUESTION this document belongs to, not of any individual node
    // within it, so every ImageNode instance in the same document shares
    // the same two values.
    return ReactNodeViewRenderer((props) => (
      <ImageNodeView
        {...props}
        questionId={props.editor.storage.image?.questionId}
        mockTestId={props.editor.storage.image?.mockTestId}
      />
    ));
  },
});
