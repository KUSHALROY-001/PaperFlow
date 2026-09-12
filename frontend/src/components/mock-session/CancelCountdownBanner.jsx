import { Clock } from "lucide-react";

export default function CancelCountdownBanner({
  secondsLeft,
  onUndo,
  title = "Cancelling this session…",
  message = "Your session will end in",
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm surface-card rounded-2xl border border-border p-6 shadow-2xl text-center space-y-4">
        <div className="mx-auto w-11 h-11 rounded-lg flex items-center justify-center bg-red-500/15 text-red-500 border border-red-500/20">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {message}{" "}
            <span className="font-mono font-bold text-foreground">
              {secondsLeft}s
            </span>{" "}
            unless you cancel this action.
          </p>
        </div>
        <button
          type="button"
          onClick={onUndo}
          className="w-full sm:w-auto rounded-md border border-border px-4 py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground transition-all hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
