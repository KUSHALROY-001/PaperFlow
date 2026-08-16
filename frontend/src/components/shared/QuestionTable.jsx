import MathText from "./MathText";

// Renders one { header, rows } block from utils/textBlocks.js#splitIntoTextBlocks
// as a real <table> - the fix for List-I/List-II (and other) tables
// rendering as a flattened, mis-aligned paragraph on screen. Each cell
// runs through MathText independently, same as an option string, since a
// data table's cells can just as easily contain a LaTeX expression as
// question text can.
export default function QuestionTable({ header, rows }) {
  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="bg-muted">
            {header.map((cell, index) => (
              <th
                key={index}
                className="border-b border-border px-3 py-2 text-left font-bold text-foreground"
              >
                <MathText text={cell} />
              </th>
            ))}
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
                  className="border-b border-border/60 px-3 py-2 align-top text-foreground"
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
