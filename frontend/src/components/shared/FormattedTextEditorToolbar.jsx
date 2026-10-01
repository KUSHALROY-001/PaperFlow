import {
  Bold,
  ChevronDown,
  Columns3,
  Code2,
  Italic,
  Rows3,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
} from "lucide-react";
import { useEffect, useState } from "react";

const TEXT_STYLE_OPTIONS = [
  { label: "Text", level: null },
  { label: "Heading 1", level: 1 },
  { label: "Heading 2", level: 2 },
  { label: "Heading 3", level: 3 },
];

const CODE_LANGUAGE_OPTIONS = [
  { label: "Plain text", value: "" },
  { label: "Bash", value: "bash" },
  { label: "C", value: "c" },
  { label: "C++", value: "cpp" },
  { label: "CSS", value: "css" },
  { label: "Go", value: "go" },
  { label: "HTML", value: "html" },
  { label: "Java", value: "java" },
  { label: "JavaScript", value: "javascript" },
  { label: "JSON", value: "json" },
  { label: "JSX", value: "jsx" },
  { label: "Python", value: "python" },
  { label: "SQL", value: "sql" },
  { label: "TypeScript", value: "typescript" },
  { label: "TSX", value: "tsx" },
  { label: "XML", value: "xml" },
  { label: "YAML", value: "yaml" },
];

const CUSTOM_LANGUAGE_VALUE = "__custom_language__";

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
  const [customLanguage, setCustomLanguage] = useState("");
  const [isCustomLanguageMode, setIsCustomLanguageMode] = useState(false);
  const tableAction = (command) => {
    runCommand(command);
  };
  const isInTable = editor.isActive("table");
  const isInCodeBlock = editor.isActive("codeBlock");
  const codeLanguage = editor.getAttributes("codeBlock").language || "";
  const isKnownCodeLanguage = CODE_LANGUAGE_OPTIONS.some(
    (language) => language.value === codeLanguage,
  );
  const isCustomLanguage = isCustomLanguageMode || !isKnownCodeLanguage;
  const selectedCodeLanguage = isCustomLanguage
    ? CUSTOM_LANGUAGE_VALUE
    : codeLanguage;

  useEffect(() => {
    setCustomLanguage(isKnownCodeLanguage ? "" : codeLanguage);
    setIsCustomLanguageMode(!isKnownCodeLanguage);
  }, [codeLanguage, isKnownCodeLanguage]);

  const setCodeLanguage = (language, preserveEditorFocus = true) => {
    const attributes = { language: language.trim() || null };

    if (preserveEditorFocus) {
      runCommand((chain) => chain.updateAttributes("codeBlock", attributes));
      return;
    }

    // The custom-language input must retain focus while it is being typed
    // into. `runCommand` restores focus to the editor by design, so update
    // the active code block directly for this particular control.
    editor.chain().updateAttributes("codeBlock", attributes).run();
  };

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
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runCommand((chain) => chain.toggleCodeBlock())}
        title="Code block"
        aria-label="Toggle code block"
        className={toolButtonClassName(disabled, editor.isActive("codeBlock"))}
      >
        <Code2 className="h-4 w-4" />
      </button>
      {isInCodeBlock && (
        <label className="ml-1 flex h-8 items-center gap-1 border-l border-border pl-2 text-xs font-semibold text-muted-foreground">
          <span className="sr-only">Code language</span>
          <select
            value={selectedCodeLanguage}
            disabled={disabled}
            onChange={(event) => {
              if (event.target.value === CUSTOM_LANGUAGE_VALUE) {
                setCustomLanguage(codeLanguage);
                setIsCustomLanguageMode(true);
                return;
              }
              setIsCustomLanguageMode(false);
              setCodeLanguage(event.target.value);
            }}
            aria-label="Code language"
            className="h-7 max-w-32 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {CODE_LANGUAGE_OPTIONS.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
            <option value={CUSTOM_LANGUAGE_VALUE}>Custom…</option>
          </select>
          {isCustomLanguage && (
            <input
              type="text"
              value={customLanguage}
              disabled={disabled}
              onChange={(event) => {
                setCustomLanguage(event.target.value);
                setCodeLanguage(event.target.value, false);
              }}
              placeholder="Language"
              aria-label="Custom code language"
              className="h-7 w-28 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
          )}
        </label>
      )}
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
      <div className="ml-1 flex items-center gap-1 border-l border-border pl-1">
        {!isInTable ? (
          <button
            type="button"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              tableAction((chain) =>
                chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
              )
            }
            title="Insert a 3 × 3 table"
            className={toolButtonClassName(disabled, false)}
          >
            <Table2 className="h-4 w-4" />
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => tableAction((chain) => chain.addRowAfter())}
              title="Add row below"
              className={toolButtonClassName(disabled, false)}
            >
              <Rows3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => tableAction((chain) => chain.addColumnAfter())}
              title="Add column to the right"
              className={toolButtonClassName(disabled, false)}
            >
              <Columns3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => tableAction((chain) => chain.toggleHeaderRow())}
              title="Toggle header row"
              className={toolButtonClassName(disabled, editor.isActive("tableHeader"))}
            >
              <Table2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => tableAction((chain) => chain.deleteRow())}
              title="Delete selected row"
              className={toolButtonClassName(disabled, false)}
            >
              <Rows3 className="h-4 w-4 text-red-500" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => tableAction((chain) => chain.deleteColumn())}
              title="Delete selected column"
              className={toolButtonClassName(disabled, false)}
            >
              <Columns3 className="h-4 w-4 text-red-500" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => tableAction((chain) => chain.deleteTable())}
              title="Delete table"
              className={toolButtonClassName(disabled, false)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
