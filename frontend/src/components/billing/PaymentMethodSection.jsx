import { CreditCard } from "lucide-react";

export default function PaymentMethodSection() {
  return (
    <div className="surface-card rounded-2xl p-5 border border-border">
      <h3 className="font-bold text-foreground mb-4">Payment Method</h3>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              Visa ending in 4242
            </p>
            <p className="text-xs text-muted-foreground font-medium">Expires 12/27</p>
          </div>
        </div>
        <button className="text-xs font-bold text-orange-500 hover:underline">
          Update
        </button>
      </div>
    </div>
  );
}
