import { AlertTriangle } from "lucide-react";

export default function SharedMockError({ loadError }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full surface-card rounded-3xl p-8 border border-border text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">
          Link not available
        </h1>
        <p className="text-sm text-muted-foreground">{loadError}</p>
      </div>
    </div>
  );
}
