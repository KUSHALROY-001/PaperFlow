import { useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";

export default function EditorPanelResizer({
  isDragging,
  isCollapsed,
  onPointerDown,
  onToggleCollapse,
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={isCollapsed ? 0 : 50}
      onPointerDown={onPointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="hidden lg:flex relative items-center justify-center w-4 -mx-1 shrink-0 cursor-col-resize select-none z-20 group self-stretch"
      title={isCollapsed ? "Expand preview" : undefined}
    >
      {/* Vertical Guideline */}
      <div
        className={`w-0.5 h-full rounded-full transition-colors duration-150 ${
          isDragging || isHovered
            ? "bg-orange-500 dark:bg-orange-500 shadow-xs shadow-orange-500/50"
            : "bg-border group-hover:bg-orange-500/60"
        }`}
      />

      {/* Interactive Center Handle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
        className={`absolute top-1/3 -translate-y-1/2 flex flex-col items-center justify-center w-5 h-8 rounded-full border shadow-md transition-all duration-150 ${
          isDragging || isHovered
            ? "bg-orange-500 text-white border-orange-600 scale-110 opacity-100"
            : "bg-card text-muted-foreground border-border opacity-70 group-hover:opacity-100 group-hover:border-orange-500/40 group-hover:text-orange-500"
        }`}
        aria-label={isCollapsed ? "Expand live preview" : "Collapse live preview"}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-3.5 h-3.5" />
        ) : isHovered ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <GripVertical className="w-3 h-3" />
        )}
      </button>

      {/* Floating Hover Tooltip (Matching reference screenshot UX) */}
      {(isHovered || isDragging) && (
        <div
          className="absolute left-7 top-1/3 -translate-y-1/2 pointer-events-none z-50 whitespace-nowrap rounded-lg border border-border bg-popover/95 dark:bg-card/95 backdrop-blur-md px-3 py-1.5 shadow-xl transition-all animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="text-[11px] font-bold text-foreground">
            {isCollapsed ? "Click to expand" : "Click to collapse"}
          </div>
          <div className="text-[10px] text-muted-foreground font-medium">
            Drag to resize
          </div>
        </div>
      )}
    </div>
  );
}
