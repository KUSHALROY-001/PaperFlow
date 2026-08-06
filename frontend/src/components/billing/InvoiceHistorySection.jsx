import { FileText, Download } from "lucide-react";

export default function InvoiceHistorySection({ invoices }) {
  return (
    <div className="surface-card rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-bold text-foreground">Invoice History</h3>
      </div>
      <div className="divide-y divide-border">
        {invoices.map((inv) => (
          <div key={inv.id} className="px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 hover:bg-muted/40 transition-colors">
            <div className="w-8 h-8 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                {inv.plan}
              </p>
              <p className="text-xs text-muted-foreground">
                {inv.date} · {inv.id}
              </p>
            </div>
            <span className="text-sm font-bold text-foreground">
              ${inv.amount}
            </span>
            <span className="text-xs bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-semibold">
              {inv.status}
            </span>
            <button className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-orange-500 transition-colors">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
