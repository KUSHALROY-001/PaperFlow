import { Loader2 } from "lucide-react";

export default function SharedMockLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-sm font-semibold">Loading test…</p>
      </div>
    </div>
  );
}
