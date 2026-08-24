/**
 * Utility functions for raw textarea formatting, markdown shortcuts,
 * tab indentation, and math wrapping calculations.
 */

/**
 * Wraps selected text in a textarea with markdown delimiters (e.g. `**` for bold, `*` for italic).
 * Returns the modified string and target selection positions.
 *
 * @param {HTMLTextAreaElement} textarea
 * @param {string} marker
 * @param {string} [fallbackText="text"]
 * @returns {{ nextValue: string, selectionStart: number, selectionEnd: number } | null}
 */
export function applyMarkdownWrap(textarea, marker, fallbackText = "text") {
  if (!textarea) return null;

  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const val = textarea.value || "";
  const selectedText = val.slice(start, end) || fallbackText;
  const nextValue = `${val.slice(0, start)}${marker}${selectedText}${marker}${val.slice(end)}`;
  const selectionStart = start + marker.length;
  const selectionEnd = selectionStart + selectedText.length;

  return { nextValue, selectionStart, selectionEnd };
}

/**
 * Handles Tab and Shift+Tab indentation inside a textarea.
 *
 * @param {HTMLTextAreaElement} textarea
 * @param {boolean} isShiftKey
 * @returns {{ nextValue: string, selectionStart: number, selectionEnd: number } | null}
 */
export function applyTabIndent(textarea, isShiftKey) {
  if (!textarea) return null;

  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const val = textarea.value || "";

  if (start === end) {
    if (isShiftKey) return null;
    const nextValue = val.substring(0, start) + "    " + val.substring(end);
    const newPos = start + 4;
    return { nextValue, selectionStart: newPos, selectionEnd: newPos };
  }

  const selectedText = val.substring(start, end);
  const lines = selectedText.split("\n");
  let newLines;
  if (isShiftKey) {
    newLines = lines.map((line) => line.replace(/^ {1,4}/, ""));
  } else {
    newLines = lines.map((line) => "    " + line);
  }
  const replacement = newLines.join("\n");
  const nextValue = val.substring(0, start) + replacement + val.substring(end);

  return {
    nextValue,
    selectionStart: start,
    selectionEnd: start + replacement.length,
  };
}

/**
 * Wraps selected text in a raw textarea with math delimiters ($...$).
 *
 * @param {HTMLTextAreaElement} textarea
 * @returns {{ nextValue: string, selectionStart: number, selectionEnd: number } | null}
 */
export function applyRawMathWrap(textarea) {
  if (!textarea) return null;

  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const val = textarea.value || "";
  const selectedText = val.slice(start, end);
  const insertion = `$${selectedText}$`;
  const nextValue = `${val.slice(0, start)}${insertion}${val.slice(end)}`;
  const cursorTarget = start + 1;

  return {
    nextValue,
    selectionStart: cursorTarget,
    selectionEnd: cursorTarget + selectedText.length,
  };
}

/**
 * Dispatches keydown events for raw textareas (Ctrl+B, Ctrl+I, Tab/Shift+Tab).
 *
 * @param {React.KeyboardEvent<HTMLTextAreaElement>} e
 * @param {(nextValue: string) => void} onUpdate
 */
export function handleTextareaKeyboardShortcuts(e, onUpdate) {
  const target = e.target;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
    e.preventDefault();
    const result = applyMarkdownWrap(target, "**", "text");
    if (result) {
      onUpdate(result.nextValue);
      requestAnimationFrame(() => {
        target.setSelectionRange(result.selectionStart, result.selectionEnd);
      });
    }
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
    e.preventDefault();
    const result = applyMarkdownWrap(target, "*", "text");
    if (result) {
      onUpdate(result.nextValue);
      requestAnimationFrame(() => {
        target.setSelectionRange(result.selectionStart, result.selectionEnd);
      });
    }
    return;
  }

  if (e.key === "Tab") {
    e.preventDefault();
    const result = applyTabIndent(target, e.shiftKey);
    if (result) {
      onUpdate(result.nextValue);
      requestAnimationFrame(() => {
        target.selectionStart = result.selectionStart;
        target.selectionEnd = result.selectionEnd;
      });
    }
  }
}
