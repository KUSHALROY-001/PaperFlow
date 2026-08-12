import { useState } from "react";
import { Clock, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDuration } from "@/lib/date";
import ThemeToggle from "../ThemeToggle";
import { ConfirmDialog } from "../design-system/ConfirmDialog";

export default function SessionHeader({
  mockTestName,
  subtitle,
  answeredCount,
  totalQuestions,
  timeLeft,
  submitting,
  handleSubmit,
  onCancelSession,
}) {
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    if (onCancelSession) {
      onCancelSession();
    } else {
      navigate(-1);
    }
  };

  return (
    <>
      <header className="min-h-14 bg-card/80 backdrop-blur-md border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center px-4 sm:px-6 py-3 sticky top-0 z-20 font-sans">
        <div className="flex-1">
          <div className="text-sm font-bold text-foreground">
            {mockTestName}
          </div>
          <div className="text-xs text-muted-foreground font-semibold">
            {subtitle ? `${subtitle} · ` : ""}
            {answeredCount}/{totalQuestions} answered
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono font-bold text-sm ${timeLeft < 120 ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-orange-500/10 text-orange-500 border border-orange-500/20"}`}
          >
            <Clock className="w-4 h-4" /> {formatDuration(timeLeft)}
          </div>
          <ThemeToggle className="h-9 w-9 rounded-xl shrink-0" />
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold rounded-xl border border-red-500/20 transition-all text-xs sm:text-sm shrink-0"
            title="Cancel test session"
          >
            <XCircle className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl shadow-xs transition-all text-xs sm:text-sm disabled:opacity-60 shrink-0"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </header>

      {showCancelModal && (
        <ConfirmDialog
          open={showCancelModal}
          onOpenChange={(open) => !open && setShowCancelModal(false)}
          title="Cancel Test Session?"
          description="Are you sure you want to cancel this session? Your active test progress will be discarded."
          confirmLabel="Cancel Session"
          destructive={true}
          onConfirm={handleConfirmCancel}
        />
      )}
    </>
  );
}
