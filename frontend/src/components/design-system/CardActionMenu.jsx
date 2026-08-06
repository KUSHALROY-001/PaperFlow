import { useState, useRef, useEffect } from "react";
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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

  const handleToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isDisabled) return;
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
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      <button
        onClick={handleToggle}
        className="w-8 h-8 rounded-xl border border-transparent hover:border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shrink-0"
        title="Options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-9 w-36 bg-card border border-border rounded-xl shadow-lg p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onClick={handleRenameClick}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted hover:text-orange-500 rounded-lg transition-colors text-left"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Rename
          </button>
          <button
            onClick={handleDeleteClick}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
