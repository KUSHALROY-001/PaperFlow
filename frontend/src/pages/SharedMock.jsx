import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useExamSession } from "@/hooks/useExamSession";
import SharedMockIntro from "../components/shared-mock/SharedMockIntro";
import SessionLoading from "../components/mock-session/SessionLoading";
import SessionError from "../components/mock-session/SessionError";
import SessionResultsView from "../components/mock-session/SessionResultsView";
import SessionQuestionNav from "../components/mock-session/SessionQuestionNav";
import SessionHeader from "../components/mock-session/SessionHeader";
import SessionQuestionView from "../components/mock-session/SessionQuestionView";

export default function SharedMock() {
  const navigate = useNavigate();
  const {
    phase,
    loadError,
    mockTestInfo,
    name,
    setName,
    starting,
    startError,
    session,
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
    isAuthenticated,
    claimStatus,
    handleStart,
    handleSubmit,
    handleAnswer,
    toggleFlag,
    claimResult,
    handleCancelSession,
  } = useExamSession({ mode: "guest" });

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

  // Keyboard navigation, same as the member session screen.
  useEffect(() => {
    if (phase !== "session" || !questions.length) return;

    const handleKeyDown = (e) => {
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
  }, [current, questions.length, phase]);

  // "Log in to save this result" - if already authenticated (e.g. logged in
  // via another tab mid-test), claim immediately. Otherwise stash intent
  // and send them to sign in/up; AuthPage picks PENDING_CLAIM_KEY back up
  // after a successful login/signup and claims from there.
  const handleSaveResult = () => {
    if (isAuthenticated) {
      claimResult();
      return;
    }
    navigate("/login");
  };

  if (phase === "loading") {
    return <SessionLoading message="Loading test…" />;
  }

  if (phase === "error") {
    return (
      <SessionError
        loadError={loadError}
        title="Link not available"
        homeHref={null}
      />
    );
  }

  if (phase === "intro") {
    return (
      <SharedMockIntro
        mockTestInfo={mockTestInfo}
        name={name}
        setName={setName}
        starting={starting}
        startError={startError}
        handleStart={handleStart}
      />
    );
  }

  if (phase === "result" && review) {
    return (
      <SessionResultsView
        review={review}
        session={session}
        isGuest
        guestName={name}
        showSaveResultBanner={claimStatus !== "saved"}
        onSaveResult={handleSaveResult}
        claimStatus={claimStatus}
        saveLabel={isAuthenticated ? "Save result" : "Log in to save"}
      />
    );
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
        exitHref="/"
      />

      <div className="flex-1 lg:ml-56 flex flex-col min-w-0">
        <SessionHeader
          mockTestName={session?.mockTest?.name}
          subtitle={name}
          answeredCount={answeredCount}
          totalQuestions={questions.length}
          timeLeft={timeLeft}
          submitting={submitting}
          handleSubmit={handleSubmit}
          onCancelSession={async () => {
            await handleCancelSession();
            navigate("/");
          }}
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
