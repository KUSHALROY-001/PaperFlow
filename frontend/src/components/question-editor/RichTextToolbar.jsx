import { useEffect, useRef, useState } from "react";
import {
  Bold,
  ChevronDown,
  Italic,
  Strikethrough,
  Underline,
} from "lucide-react";

const blockStyles = [
  { value: "text", label: "Text" },
  { value: "heading1", label: "Heading 1" },
  { value: "heading2", label: "Heading 2" },
  { value: "heading3", label: "Heading 3" },
];

function selectionRange(textarea) {
  return {
    start: textarea?.selectionStart ?? 0,
    end: textarea?.selectionEnd ?? 0,
  };
}

function applyInlineStyle(textarea, openingMarker, closingMarker, updateValue) {
  if (!textarea) return;

  const { start, end } = selectionRange(textarea);
  const value = textarea.value;
  const selected = value.slice(start, end);
  const hasMatchingWrapper =
    value.slice(start - openingMarker.length, start) === openingMarker &&
    value.slice(end, end + closingMarker.length) === closingMarker;
  const isItalicInsideBoldAndItalic =
    openingMarker === "*" &&
    value.slice(start - 3, start) === "***" &&
    value.slice(end, end + 3) === "***";
  const isItalicOnly =
    openingMarker === "*" &&
    hasMatchingWrapper &&
    value[start - 2] !== "*" &&
    value[end + 1] !== "*";
  const isWrapped = openingMarker === "*"
    ? isItalicOnly || isItalicInsideBoldAndItalic
    : hasMatchingWrapper;

  if (isWrapped) {
    const next = `${value.slice(0, start - openingMarker.length)}${selected}${value.slice(end + closingMarker.length)}`;
    updateValue(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start - openingMarker.length, end - openingMarker.length);
    });
    return;
  }

  const insertion = `${openingMarker}${selected || "text"}${closingMarker}`;
  const next = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
  const selectedStart = start + openingMarker.length;
  const selectedEnd = selectedStart + (selected || "text").length;

  updateValue(next);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(selectedStart, selectedEnd);
  });
}

function lineStyleParts(line) {
  const match = line.match(/^((?:(?:\*\*|~~|\*|<u>)*))(#{1,3})\s+/);
  if (!match) return { openingStyles: "", heading: null, contentStart: 0 };
  return {
    openingStyles: match[1],
    heading: match[2].length,
    contentStart: match[0].length,
  };
}

function applyBlockStyle(textarea, style, updateValue) {
  if (!textarea) return;

  const { start, end } = selectionRange(textarea);
  const value = textarea.value;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end);
  const sectionEnd = lineEnd === -1 ? value.length : lineEnd;
  const lines = value.slice(lineStart, sectionEnd).split("\n");
  const requestedLevel = style === "text" ? null : Number(style.at(-1));
  const updatedLines = lines.map((line) => {
    const parts = lineStyleParts(line);
    const nextLevel = parts.heading === requestedLevel ? null : requestedLevel;
    const content = parts.heading ? line.slice(parts.contentStart) : line;
    const prefix = nextLevel ? `${"#".repeat(nextLevel)} ` : "";
    return `${parts.openingStyles}${prefix}${content}`;
  });
  const replacement = updatedLines.join("\n");
  const next = `${value.slice(0, lineStart)}${replacement}${value.slice(sectionEnd)}`;
  updateValue(next);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(lineStart, lineStart + replacement.length);
  });
}

export default function RichTextToolbar({ textareaRef, disabled, onChange }) {
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [style, setStyle] = useState("text");
  const menuRef = useRef(null);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsStyleMenuOpen(false);
    };

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const runInlineStyle = (openingMarker, closingMarker = openingMarker) => {
    if (disabled) return;
    applyInlineStyle(textareaRef.current, openingMarker, closingMarker, onChange);
  };

  const selectBlockStyle = (nextStyle) => {
    if (disabled) return;
    const currentLine = textareaRef.current?.value
      .slice(
        textareaRef.current.value.lastIndexOf("\n", textareaRef.current.selectionStart - 1) + 1,
        textareaRef.current.value.indexOf("\n", textareaRef.current.selectionEnd) === -1
          ? textareaRef.current.value.length
          : textareaRef.current.value.indexOf("\n", textareaRef.current.selectionEnd),
      ) || "";
    const currentHeading = lineStyleParts(currentLine).heading;
    const requestedHeading = nextStyle === "text" ? null : Number(nextStyle.at(-1));
    setStyle(currentHeading === requestedHeading ? "text" : nextStyle);
    setIsStyleMenuOpen(false);
    applyBlockStyle(textareaRef.current, nextStyle, onChange);
  };

  const buttonClassName = `flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
    disabled
      ? "cursor-not-allowed text-muted-foreground/40"
      : "text-foreground hover:bg-muted"
  }`;

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1.5">
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runInlineStyle("**")}
        title="Bold (Ctrl+B)"
        className={buttonClassName}
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runInlineStyle("*")}
        title="Italic (Ctrl+I)"
        className={buttonClassName}
      >
        <Italic className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runInlineStyle("<u>", "</u>")}
        title="Underline"
        className={buttonClassName}
      >
        <Underline className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runInlineStyle("~~")}
        title="Strikethrough"
        className={buttonClassName}
      >
        <Strikethrough className="h-4 w-4" />
      </button>

      <div ref={menuRef} className="relative ml-1 border-l border-border pl-1">
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
          {blockStyles.find((item) => item.value === style)?.label}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {isStyleMenuOpen && !disabled && (
          <div className="absolute left-0 top-10 z-20 min-w-40 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl">
            {blockStyles.map((item) => (
              <button
                type="button"
                key={item.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectBlockStyle(item.value)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                  style === item.value
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
