import { useRef } from "react";
import { buildHighlightNodes } from "@/utils/textHighlight";

// The "Formatted" alternative to a plain <textarea> for Question Text /
// Explanation: a real, fully-native <textarea> handles ALL typing,
// cursor movement, and selection exactly like Raw mode does (same
// value/onChange contract, committing on every keystroke) - it's just
// made transparent and stacked on top of a styled preview layer drawn
// behind it (buildHighlightNodes in textHighlight.js), so bold/italic/
// underline/strikethrough/code/math-delimiters stay visibly styled the
// ENTIRE time the user is typing, not just before/after.
//
// This replaced an earlier version that swapped a block between a
// rendered (read-only) form and a raw-text textarea on click - which
// technically worked, but meant the text visibly reverted to raw
// markup the moment you started editing it, which is exactly the
// problem this component exists to solve. The fix is architectural, not
// a tweak: never substitute rendered output for source text at all.
// buildHighlightNodes only ever wraps substrings of the EXACT SAME text
// in styled <span>s - it never shortens "**bold**" to "bold" or
// replaces "$x$" with a rendered equation, because doing so would make
// the overlay's text a different length than the textarea's, which
// would desync the two layers and make the visible cursor position
// land in the wrong place relative to what's drawn behind it. That
// same rule is why $...$ math shows as styled monospace source here,
// not an actual rendered formula - true inline-rendered math while
// typing needs a real editor framework (contentEditable reconciliation
// byte-for-byte is a well-known hard problem), which is a bigger,
// separate piece of work than this.
//
// Because both layers render identical characters with identical font/
// line-height/padding (the shared `${sizingClassName}` below - change
// one, change the other), they stay pixel-aligned automatically. The
// only synchronization actually needed is scroll position, handled by
// mirroring the textarea's scrollTop/scrollLeft onto the overlay.
export default function FormattedTextEditor({
  value,
  onChange,
  disabled,
  placeholder,
}) {
  const overlayRef = useRef(null);

  const syncScroll = (e) => {
    if (!overlayRef.current) return;
    overlayRef.current.scrollTop = e.target.scrollTop;
    overlayRef.current.scrollLeft = e.target.scrollLeft;
  };

  const sizingClassName =
    "w-full min-h-24 px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-sans";

  return (
    <div className="relative">
      <div
        ref={overlayRef}
        aria-hidden="true"
        className={`${sizingClassName} absolute inset-0 overflow-auto rounded-xl border border-border pointer-events-none text-foreground`}
      >
        {value ? (
          buildHighlightNodes(value)
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        {/* A trailing newline in the value collapses to nothing visually
            unless something follows it - without this the overlay's
            scroll height can fall a line short of the (identical-text)
            textarea's, which would clip the last line during scroll. */}
        {value?.endsWith("\n") && <br />}
      </div>
      <textarea
        disabled={disabled}
        value={value}
        onChange={(e) => !disabled && onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder={placeholder}
        className={`${sizingClassName} relative resize-vertical rounded-xl border border-border bg-transparent caret-foreground text-transparent focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
        style={{
          // Selection highlight would otherwise be invisible too (it's
          // drawn on the transparent-text layer) - give it a visible
          // tint without needing the text itself to render.
          WebkitTextFillColor: "transparent",
        }}
      />
    </div>
  );
}
