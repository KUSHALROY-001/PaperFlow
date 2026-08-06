import { AlertTriangle } from "lucide-react";
import { useSharedMock } from "@/hooks/useSharedMock";
import SharedMockLoading from "../components/shared-mock/SharedMockLoading";
import SharedMockError from "../components/shared-mock/SharedMockError";
import SharedMockIntro from "../components/shared-mock/SharedMockIntro";
import SharedMockResult from "../components/shared-mock/SharedMockResult";
import SharedMockHeader from "../components/shared-mock/SharedMockHeader";
import SharedMockSessionView from "../components/shared-mock/SharedMockSessionView";

export default function SharedMock() {
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
    handleStart,
    handleSubmit,
    handleAnswer,
    toggleFlag,
  } = useSharedMock();

  if (phase === "loading") {
    return <SharedMockLoading />;
  }

  if (phase === "error") {
    return <SharedMockError loadError={loadError} />;
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
      <SharedMockResult
        review={review}
        name={name}
        mockTestInfo={mockTestInfo}
      />
    );
  }

  if (!q) {
    return null;
  }

  const selected = answers[q.questionId]?.selected?.[0];
  const answeredCount = Object.values(answers).filter(
    (a) => a.selected.length,
  ).length;

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
      <SharedMockHeader
        mockTestName={session?.mockTest?.name}
        name={name}
        answeredCount={answeredCount}
        totalQuestions={questions.length}
        timeLeft={timeLeft}
        submitting={submitting}
        handleSubmit={handleSubmit}
      />

      {submitError && (
        <div className="mx-4 sm:mx-6 mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {submitError}
        </div>
      )}

      <SharedMockSessionView
        q={q}
        current={current}
        totalQuestions={questions.length}
        questions={questions}
        selected={selected}
        flagged={flagged}
        answers={answers}
        toggleFlag={toggleFlag}
        handleAnswer={handleAnswer}
        setCurrent={setCurrent}
      />
    </div>
  );
}
