import { useMemo } from "react";
import MathText from "./MathText";

export default function QuestionTable({
  header = [],
  rows = [],
  colWidths = null,
}) {
  const widths = useMemo(() => {
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

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-border">
      <table
        className="w-full border-collapse text-xs sm:text-sm relative"
        style={{ tableLayout: "fixed" }}
      >
        <colgroup>
          {widths.map((width, i) => (
            <col key={i} style={{ width }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-muted">
            {header.map((cell, index) => {
              return (
                <th
                  key={index}
                  style={{ width: widths[index] }}
                  className="border-b border-border px-3 py-2 text-left font-bold text-foreground"
                >
                  <div className="break-words">
                    <MathText text={cell} />
                  </div>
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
                  style={{ width: widths[cellIndex] }}
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
