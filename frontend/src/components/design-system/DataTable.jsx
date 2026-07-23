import { cn } from "@/lib/utils";

function DataTable({
  columns = [],
  rows = [],
  getRowKey,
  emptyMessage = "No data yet.",
  className,
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-semibold">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr
                  key={getRowKey ? getRowKey(row) : row.id || rowIndex}
                  className="border-b last:border-b-0"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3 align-middle text-foreground"
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-4 py-8 text-center text-muted-foreground"
                  colSpan={columns.length || 1}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { DataTable };
