import { Clock, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDuration } from "@/lib/date";
import ThemeToggle from "../ThemeToggle";

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

  const handleCancelClick = () => {
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
          <div className="text-xs text-muted-foreground font-normal">
            {subtitle ? `${subtitle} · ` : ""}
            {answeredCount}/{totalQuestions} answered
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 font-mono font-bold text-sm ${timeLeft < 120 ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-orange-500/10 text-orange-500 border border-orange-500/20"}`}
          >
            <Clock className="w-4 h-4" /> {formatDuration(timeLeft)}
          </div>
          <ThemeToggle className="h-9 w-9 rounded-full shrink-0" />
          <button
            type="button"
            onClick={handleCancelClick}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold rounded-full border border-red-500/20 transition-all text-xs sm:text-sm shrink-0"
            title="Cancel test session"
          >
            <XCircle className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md shadow-xs transition-all text-xs sm:text-sm disabled:opacity-60 shrink-0"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </header>
    </>
  );
}
