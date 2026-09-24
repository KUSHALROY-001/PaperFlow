import { useCallback } from "react";

// Wraps a TipTap chain command so a toolbar click doesn't make people
// re-select the same text before applying another mark or heading. Mark/
// block commands don't change document positions, so restoring this
// exact range afterward is safe - this also covers option-menu commands
// invoked through FormattedTextEditor's ref.
export function useSelectionPreservingCommand(editor, disabled) {
  return useCallback(
    (command) => {
      if (!editor || disabled) return false;

      const { from, to } = editor.state.selection;
      const hasTextRange = from !== to;
      const didRun = command(editor.chain().focus()).run();

      if (didRun && hasTextRange) {
        editor.commands.setTextSelection({ from, to });
        // Parent state receives the serialized markdown on every update.
        // Restore once more after that controlled update settles;
        // otherwise some browsers collapse the highlight after the first
        // toolbar click.
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
}
