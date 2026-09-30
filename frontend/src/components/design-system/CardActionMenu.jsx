import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function CardActionMenu({
  onRename,
  onDelete,
  disabled,
  className = "",
}) {
  const { isViewer } = useAuth();
  const isDisabled = disabled ?? isViewer;
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = 144;
    const menuHeight = 84;
    const gutter = 8;
    const shouldOpenUpward =
      window.innerHeight - rect.bottom < menuHeight + gutter &&
      rect.top >= menuHeight + gutter;

    setMenuPosition({
      top: shouldOpenUpward
        ? rect.top - menuHeight - 4
        : rect.bottom + 4,
      left: Math.min(
        window.innerWidth - menuWidth - gutter,
        Math.max(gutter, rect.right - menuWidth),
      ),
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedMenu = menuRef.current?.contains(event.target);
      const clickedTrigger = triggerRef.current?.contains(event.target);
      if (!clickedMenu && !clickedTrigger) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Table views need horizontal scrolling on small screens. Rendering the
  // menu in a portal keeps it outside that overflow boundary, and choosing
  // the upper side near the viewport bottom keeps the last row actionable.
  useEffect(() => {
    if (!open) return undefined;

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  const handleToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isDisabled) return;
    updateMenuPosition();
    setOpen((prev) => !prev);
  };

  const handleRenameClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(false);
    onRename();
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(false);
    onDelete();
  };

  if (isDisabled) {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          disabled
          className="w-8 h-8 rounded-xl border border-transparent flex items-center justify-center text-muted-foreground/40 cursor-not-allowed opacity-50 shrink-0"
          title="Editor role is required to modify this item"
        >
          <MoreVertical className="w-4 h-4 cursor-not-allowed" />
        </button>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="w-8 h-8 rounded-xl border border-transparent hover:border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shrink-0"
        title="Options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            className="fixed w-36 bg-card border border-border rounded-xl shadow-lg p-1 z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              role="menuitem"
              onClick={handleRenameClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted hover:text-orange-500 rounded-lg transition-colors text-left"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Rename
            </button>
            <button
              role="menuitem"
              onClick={handleDeleteClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
