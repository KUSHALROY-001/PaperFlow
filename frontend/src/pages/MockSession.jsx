import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Keyboard,
  X,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useExamSession } from "@/hooks/useExamSession";
import { usePreventSessionExit } from "@/hooks/usePreventSessionExit";
import SessionLoading from "../components/mock-session/SessionLoading";
import SessionError from "../components/mock-session/SessionError";
import SessionResultsView from "../components/mock-session/SessionResultsView";
import SessionQuestionNav from "../components/mock-session/SessionQuestionNav";
import SessionHeader from "../components/mock-session/SessionHeader";
import SessionQuestionView from "../components/mock-session/SessionQuestionView";
import { ConfirmDialog } from "../components/design-system/ConfirmDialog";

export default function MockSession() {
  const navigate = useNavigate();
  const {
    loading,
    loadError,
    session,
    topics,
    current,
    setCurrent,
    answers,
    flagged,
    timeLeft,
    submitting,
    submitError,
    review,
    questions,
    q,
    answeredCount,
    progress,
    handleSubmit,
    handleAnswer,
    toggleFlag,
    handleCancelSession,
  } = useExamSession({ mode: "member" });

  const [slideDirection, setSlideDirection] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);

  const {
    showExitConfirm,
    setShowExitConfirm,
    confirmExit,
  } = usePreventSessionExit({
    isActive: !loading && !loadError && !review && Boolean(session) && Boolean(q),
    onConfirmExit: async () => {
      await handleCancelSession();
      navigate(-1);
    },
  });

  const handleCancel = async () => {
    setShowExitConfirm(true);
  };

  const handleNavigateNext = () => {
    if (current < questions.length - 1) {
      setSlideDirection("left");
      setCurrent(current + 1);
    }
  };

  const handleNavigatePrev = () => {
    if (current > 0) {
      setSlideDirection("right");
      setCurrent(current - 1);
    }
  };

  const handleSelectQuestion = (index) => {
    if (index > current) {
      setSlideDirection("left");
    } else if (index < current) {
      setSlideDirection("right");
    }
    setCurrent(index);
  };

  // Keyboard navigation: ArrowRight -> next, ArrowLeft -> prev, A-F -> Mark option
  useEffect(() => {
    if (review || loading || !session || !questions.length) return;
    const handleKeyDown = (e) => {
      // Ignore key events when user is typing inside an input/textarea element
      if (
        e.target &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNavigateNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleNavigatePrev();
      } else if (/^[a-fA-F]$/.test(e.key)) {
        const optionIndex = e.key.toLowerCase().charCodeAt(0) - 97; // 'a' is 97
        if (q && q.options && optionIndex < q.options.length) {
          e.preventDefault();
          handleAnswer(optionIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [current, questions.length, review, loading, session, q, handleAnswer]);

  if (loading) {
    return <SessionLoading />;
  }
  if (loadError) {
    return <SessionError loadError={loadError} />;
  }
  if (review) {
    return <SessionResultsView review={review} session={session} />;
  }
  if (!q) {
    return null;
  }
  const selected = answers[q.questionId]?.selected?.[0];

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row font-sans">
      <SessionQuestionNav
        questions={questions}
        current={current}
        setCurrent={setCurrent}
        onSelectQuestion={handleSelectQuestion}
        answers={answers}
        flagged={flagged}
      />
      <div className="flex-1 lg:ml-56 flex flex-col min-w-0 relative">
        <SessionHeader
          mockTestName={session?.mockTest?.name}
          subtitle={topics.length ? topics.join(", ") : undefined}
          answeredCount={answeredCount}
          totalQuestions={questions.length}
          timeLeft={timeLeft}
          submitting={submitting}
          handleSubmit={handleSubmit}
          onCancelSession={handleCancel}
        />

        {/* Shortcut Info Bar */}
        <div className="flex justify-end px-4 sm:px-6 pt-4 pb-2">
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold border border-border rounded-xl transition-colors"
          >
            <Keyboard className="w-4 h-4" /> Shortcuts
          </button>
        </div>

        {submitError && (
          <div className="mx-4 sm:mx-6 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {submitError}
          </div>
        )}

        <SessionQuestionView
          q={q}
          current={current}
          totalQuestions={questions.length}
          selected={selected}
          flagged={flagged}
          toggleFlag={toggleFlag}
          handleAnswer={handleAnswer}
          progress={progress}
          slideDirection={slideDirection}
          onNavigateNext={handleNavigateNext}
          onNavigatePrev={handleNavigatePrev}
        />
      </div>

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm surface-card rounded-2xl border border-border p-6 shadow-2xl relative">
            <button
              onClick={() => setShowShortcuts(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-orange-500" />
              Keyboard Shortcuts
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">
                  Next Question
                </span>
                <kbd className="px-2 py-1 bg-muted border border-border rounded-lg font-mono font-bold text-foreground">
                  <ArrowRight></ArrowRight>
                </kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">
                  Previous Question
                </span>
                <kbd className="px-2 py-1 bg-muted border border-border rounded-lg font-mono font-bold text-foreground">
                  <ArrowLeft></ArrowLeft>
                </kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">
                  Select Option
                </span>
                <kbd className="px-2 py-1 bg-muted border border-border rounded-lg font-mono font-bold text-foreground">
                  A - F
                </kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">
                  Unselect Option
                </span>
                <kbd className="px-2 py-1 bg-muted border border-border rounded-lg font-mono font-bold text-foreground">
                  Same Key
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <ConfirmDialog
          open={showExitConfirm}
          onOpenChange={setShowExitConfirm}
          title="Exit Test Session?"
          description="Are you sure you want to exit this mock test session? Your active test progress will be lost."
          confirmLabel="Exit Test"
          cancelLabel="Continue Test"
          destructive={true}
          onConfirm={confirmExit}
        />
      )}
    </div>
  );
}
