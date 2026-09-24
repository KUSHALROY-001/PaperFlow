import { Bold, ChevronDown, Italic, Strikethrough, Underline } from "lucide-react";

const TEXT_STYLE_OPTIONS = [
  { label: "Text", level: null },
  { label: "Heading 1", level: 1 },
  { label: "Heading 2", level: 2 },
  { label: "Heading 3", level: 3 },
];

function toolButtonClassName(disabled, isActive) {
  let tone;
  if (disabled) {
    tone = "cursor-not-allowed text-muted-foreground/40";
  } else if (isActive) {
    tone = "bg-orange-500 text-white shadow-sm";
  } else {
    tone = "text-foreground hover:bg-muted";
  }
  return `flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${tone}`;
}

// Toolbar for FormattedTextEditor: bold/italic/underline/strike marks
// plus the text-style (paragraph/heading) menu. Purely presentational -
// all editor mutation happens through the runCommand/setTextStyle
// callbacks passed in, so this component has no ProseMirror knowledge of
// its own.
export function FormattedTextEditorToolbar({
  editor,
  disabled,
  runCommand,
  textStyle,
  setTextStyle,
  isStyleMenuOpen,
  setIsStyleMenuOpen,
  styleMenuRef,
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1  border border-border bg-muted/40 p-1.5">
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runCommand((chain) => chain.toggleBold())}
        title="Bold (Ctrl+B)"
        className={toolButtonClassName(disabled, editor.isActive("bold"))}
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runCommand((chain) => chain.toggleItalic())}
        title="Italic (Ctrl+I)"
        className={toolButtonClassName(disabled, editor.isActive("italic"))}
      >
        <Italic className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runCommand((chain) => chain.toggleUnderline())}
        title="Underline"
        className={toolButtonClassName(disabled, editor.isActive("underline"))}
      >
        <Underline className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runCommand((chain) => chain.toggleStrike())}
        title="Strikethrough"
        className={toolButtonClassName(disabled, editor.isActive("strike"))}
      >
        <Strikethrough className="h-4 w-4" />
      </button>
      <div ref={styleMenuRef} className="relative ml-1 border-l border-border pl-1">
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
            {TEXT_STYLE_OPTIONS.map((item) => (
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
  );
}
