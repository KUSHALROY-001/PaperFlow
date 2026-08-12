import { Link } from "react-router-dom";
import { AlertTriangle, Home } from "lucide-react";

export default function SessionError({
  loadError,
  title = "Couldn't start this session",
  homeHref = "/dashboard",
  homeLabel = "Back to Dashboard",
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full surface-card rounded-3xl p-8 border border-border text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{loadError}</p>
        {homeHref && (
          <Link
            to={homeHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl text-sm"
          >
            <Home className="w-4 h-4" /> {homeLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
