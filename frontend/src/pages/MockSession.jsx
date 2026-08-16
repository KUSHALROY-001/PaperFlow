import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useExamSession } from "@/hooks/useExamSession";
import SessionLoading from "../components/mock-session/SessionLoading";
import SessionError from "../components/mock-session/SessionError";
import SessionResultsView from "../components/mock-session/SessionResultsView";
import SessionQuestionNav from "../components/mock-session/SessionQuestionNav";
import SessionHeader from "../components/mock-session/SessionHeader";
import SessionQuestionView from "../components/mock-session/SessionQuestionView";

export default function MockSession() {
  const navigate = useNavigate();
  const {
    loading,
    loadError,
    session,
    topic,
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

  const handleCancel = async () => {
    await handleCancelSession();
    navigate(-1);
  };

  const [slideDirection, setSlideDirection] = useState("");

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

  // Keyboard navigation: ArrowRight -> next, ArrowLeft -> prev
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [current, questions.length, review, loading, session]);

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

      <div className="flex-1 lg:ml-56 flex flex-col min-w-0">
        <SessionHeader
          mockTestName={session?.mockTest?.name}
          subtitle={topic}
          answeredCount={answeredCount}
          totalQuestions={questions.length}
          timeLeft={timeLeft}
          submitting={submitting}
          handleSubmit={handleSubmit}
          onCancelSession={handleCancel}
        />

        {submitError && (
          <div className="mx-4 sm:mx-6 mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
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
    </div>
  );
}
