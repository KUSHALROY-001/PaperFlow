import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import MathText from "./MathText";

export default function QuestionTable({
  header = [],
  rows = [],
  colWidths = null,
  editable = false,
  onColWidthsChange,
}) {
  const tableRef = useRef(null);
  const [draggingColIndex, setDraggingColIndex] = useState(null);
  const [hoveredDividerIndex, setHoveredDividerIndex] = useState(null);

  // Compute default even column widths if not explicitly provided
  const initialWidths = useMemo(() => {
    if (
      Array.isArray(colWidths) &&
      colWidths.length === header.length &&
      colWidths.every((w) => typeof w === "string" && w.endsWith("%"))
    ) {
      return colWidths;
    }
    const defaultPercent = Math.round(100 / (header.length || 1));
    return header.map((_, i) =>
      i === header.length - 1
        ? `${100 - defaultPercent * (header.length - 1)}%`
        : `${defaultPercent}%`,
    );
  }, [colWidths, header]);

  const [liveWidths, setLiveWidths] = useState(initialWidths);
  const liveWidthsRef = useRef(liveWidths);

  useEffect(() => {
    setLiveWidths(initialWidths);
    liveWidthsRef.current = initialWidths;
  }, [initialWidths]);

  const handlePointerDown = useCallback(
    (colIndex, event) => {
      if (!editable || !onColWidthsChange) return;
      event.preventDefault();
      event.stopPropagation();

      setDraggingColIndex(colIndex);

      const handlePointerMove = (e) => {
        if (!tableRef.current) return;
        const rect = tableRef.current.getBoundingClientRect();
        if (rect.width <= 0) return;

        const offsetX = e.clientX - rect.left;
        let percent = Math.round((offsetX / rect.width) * 100);

        // Clamping bounds to prevent columns from becoming invisible
        if (percent < 15) percent = 15;
        if (percent > 85) percent = 85;

        let nextWidths;
        if (header.length === 2) {
          nextWidths = [`${percent}%`, `${100 - percent}%`];
        } else {
          // General case for multi-column tables
          nextWidths = [...liveWidthsRef.current];
          nextWidths[colIndex] = `${percent}%`;
        }

        liveWidthsRef.current = nextWidths;
        setLiveWidths(nextWidths);
      };

      const handlePointerUp = () => {
        setDraggingColIndex(null);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        if (onColWidthsChange && liveWidthsRef.current) {
          onColWidthsChange(liveWidthsRef.current);
        }
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [editable, header.length, onColWidthsChange],
  );

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-border">
      <table
        ref={tableRef}
        className="w-full border-collapse text-xs sm:text-sm relative"
        style={{ tableLayout: "fixed" }}
      >
        <colgroup>
          {liveWidths.map((width, i) => (
            <col key={i} style={{ width }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-muted">
            {header.map((cell, index) => {
              const isLastCol = index === header.length - 1;
              const isDraggingThis = draggingColIndex === index;
              const isHoveredThis = hoveredDividerIndex === index;

              return (
                <th
                  key={index}
                  style={{ width: liveWidths[index] }}
                  className="relative border-b border-border px-3 py-2 text-left font-bold text-foreground overflow-visible"
                >
                  <div className="truncate pr-2">
                    <MathText text={cell} />
                  </div>

                  {/* Column Resizer Dragger Handle (Only in editable mode on non-last columns) */}
                  {editable && !isLastCol && (
                    <div
                      onPointerDown={(e) => handlePointerDown(index, e)}
                      onMouseEnter={() => setHoveredDividerIndex(index)}
                      onMouseLeave={() => setHoveredDividerIndex(null)}
                      className="absolute right-0 top-0 bottom-0 w-5 translate-x-1/2 flex items-center justify-center cursor-col-resize z-30 select-none group"
                      title="Drag to resize column width"
                    >
                      {/* Compact Dragger Pill (Opposite theme background color) */}
                      <div
                        className={`h-5 w-3.5 rounded-full flex items-center justify-center bg-foreground text-background shadow-md border border-background/20 transition-all duration-150 ${
                          isDraggingThis || isHoveredThis
                            ? "scale-110 opacity-100 ring-2 ring-orange-500/60 shadow-lg"
                            : "opacity-75 group-hover:opacity-100"
                        }`}
                      >
                        <GripVertical className="w-2.5 h-2.5" />
                      </div>

                      {/* Tooltip showing live column percentage split */}
                      {(isDraggingThis || isHoveredThis) && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none z-40 whitespace-nowrap rounded-md bg-foreground text-background px-2 py-0.5 text-[10px] font-extrabold shadow-lg">
                          {liveWidths[0]} | {liveWidths[1]}
                        </div>
                      )}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={rowIndex % 2 === 1 ? "bg-muted/40" : undefined}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  style={{ width: liveWidths[cellIndex] }}
                  className="border-b border-border/60 px-3 py-2 align-top text-foreground break-words overflow-hidden"
                >
                  <MathText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
