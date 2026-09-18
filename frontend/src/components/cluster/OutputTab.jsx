import MarksBadge from "@/components/shared/MarksBadge";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Download, Edit2, Loader2 } from "lucide-react";
import QuestionContent, {
  QuestionExplanation,
} from "../shared/QuestionContent";
import MathText from "../shared/MathText";
import QuestionJumpInput from "../shared/QuestionJumpInput";
import { api } from "@/lib/api";
import ScrollToTopButton from "../shared/ScrollToTopButton";
import { DiagramAssetsProvider } from "@/lib/diagramAssetsContext";
import {
  getQuestionOrderMode,
  resolveQuestionMarks,
} from "@/utils/mockTestHelpers";
import LiveExtractionBanner from "./LiveExtractionBanner";

const viewTabs = ["Visual", "JSON", "Metadata"];

export default function OutputTab({
  questions,
  metadata,
  mockTestId,
  mocktest,
  isProcessing = false,
  isStreamingQuestions = false,
  loadedQuestionCount = 0,
  totalQuestionCount = 0,
  hasMoreQuestions = false,
  onLoadMoreQuestions,
  onLoadThroughQuestion,
}) {
  const isRandomOrder = getQuestionOrderMode(mocktest) === "random";
  const [activeView, setActiveView] = useState("Visual");
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");
  // Set by handleJumpToQuestion, consumed by the effect below. A plain
  // rAF/setTimeout after setActiveView("Visual") would race React's
  // render - this component may need to switch OFF the JSON/Metadata
  // view before the target question's DOM node even exists, so the
  // scroll has to be driven by a real effect dependency (activeView),
  // not a timing guess.
  const [pendingScrollTo, setPendingScrollTo] = useState(null);

  // Returns true/false (found or not) - QuestionJumpInput owns showing
  // the "not found" message itself based on this return value.
  const handleJumpToQuestion = (questionNo) => {
    const target =
      questions.find((q) => q.questionNo === questionNo) ||
      questions.find((q) => q.displayIndex === questionNo);
    if (!target) {
      if (!onLoadThroughQuestion?.(questionNo)) return false;
      setActiveView("Visual");
      setPendingScrollTo(questionNo);
      return true;
    }
    setActiveView("Visual");
    setPendingScrollTo(target.questionNo);
    return true;
  };

  useEffect(() => {
    if (pendingScrollTo == null) return undefined;
    const el = document.getElementById(`question-${pendingScrollTo}`);
    // Not found yet on this render (e.g. we just switched activeView to
    // "Visual" this same tick and the Visual list hasn't painted) - do
    // nothing and let the next run of this effect (triggered by
    // activeView changing) try again. pendingScrollTo stays set until it
    // actually succeeds.
    if (!el) return undefined;

    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-orange-500", "ring-offset-2");
    const timeoutId = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-orange-500", "ring-offset-2");
    }, 1600);
    setPendingScrollTo(null);
    return () => window.clearTimeout(timeoutId);
  }, [pendingScrollTo, activeView, questions]);

  const exportPayload = useMemo(
    () => ({
      metadata,
      questions: questions.map((question) => ({
        id: question.id,
        questionNo: question.questionNo,
        topic: question.topic,
        question: question.text,
        options: question.options,
        correctOptionIndexes: question.correctOptionIndexes,
        // Numerical-type questions (JEE-style "enter the value") have no
        // options and store their answer separately as numericAnswer
        // (+ an optional numericTolerance for range answers like
        // "[1.15 to 1.25]") rather than in `answer`, which is MCQ-only.
        // Fall back so the export doesn't silently ship an empty answer
        // for every numerical question.
        answer: question.answer || question.numericAnswer,
        numericAnswer: question.numericAnswer,
        numericTolerance: question.numericTolerance,
        confidence: question.confidence,
        status: question.status,
        // diagramUrl deliberately excluded here - it's a short-lived
        // HMAC-signed URL (see question-assets.service.js#buildDiagramUrl),
        // not a stable link. Including it in a JSON someone downloads and
        // opens later would just be a dead/expired URL by then.
      })),
    }),
    [metadata, questions],
  );

  const jsonContent = JSON.stringify(exportPayload, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  // Replaces the old JSON-blob download (still available via the JSON
  // tab / Copy button, both untouched). This used to run entirely
  // client-side through pdf-lib (see utils/generateMockTestPdf.js,
  // now unused), flattening math into a plain-text ASCII approximation
  // because pdf-lib has no math-layout engine - which is exactly why the
  // downloaded PDF looked worse than the screen. Now hits the backend's
  // Puppeteer export (see backend/src/lib/pdf-export), which renders the
  // question HTML through the SAME katex.renderToString call MathText.jsx
  // uses on screen, then prints that real DOM to PDF - the export is a
  // faithful copy of the Output tab, not a re-derivation of it.
  const handleDownload = async () => {
    setPdfError("");
    setIsGeneratingPdf(true);
    try {
      const blob = await api.exportMockTestPdf(mockTestId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // metadata comes from useMockTestWorkspace.js, which names this
      // field mockTestName (mirroring the mock_tests.name DB column) -
      // not `title`, which doesn't exist on this object and was silently
      // falling back to the hardcoded default below every time.
      link.download = `${(metadata?.mockTestName || "mock-test").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setPdfError(error.message || "Could not generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 font-inter w-full min-w-0">
      {/* Placed above the view switcher rather than inside the Visual
          list, so the JSON and Metadata views also make it obvious that
          what's being exported is still incomplete. */}
      <LiveExtractionBanner
        isProcessing={isProcessing}
        isStreaming={isStreamingQuestions}
        loadedCount={loadedQuestionCount}
        totalCount={totalQuestionCount}
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex max-w-full rounded-3xl bg-muted/60 p-1.5 border border-border">
          {viewTabs.map((view) => {
            const active = activeView === view;
            return (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`rounded-3xl px-3 py-2 text-xs sm:px-4 sm:text-sm font-semibold transition-all ${
                  active
                    ? "bg-[#ea580c] text-white shadow-xs"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                {view}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <QuestionJumpInput onJump={handleJumpToQuestion} />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted"
          >
            <Copy className="h-4 w-4 text-orange-500" />
            {copied ? "Copied" : "Copy"}
          </button>
          <div>
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownload}
              className={`inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all ${
                isGeneratingPdf
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-muted"
              }`}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
              ) : (
                <Download className="h-4 w-4 text-orange-500" />
              )}
              {isGeneratingPdf ? "Generating\u2026" : "Download"}
            </button>
            {pdfError && (
              <p className="mt-2 text-xs font-bold text-red-500">{pdfError}</p>
            )}
          </div>
        </div>
      </div>

      {activeView === "Visual" && (
        <div className="grid gap-4 w-full min-w-0">
          {isRandomOrder && questions.length > 0 && (
            <p className="text-xs font-semibold text-muted-foreground rounded-xl border border-border bg-muted/40 px-3 py-2">
              Showing questions in random student order. Paper numbers are
              unchanged.
            </p>
          )}
          {questions.map((question) => {
            const marks =
              question.effectiveMarks ||
              resolveQuestionMarks(question, mocktest);
            const listNumber = isRandomOrder
              ? question.displayIndex
              : question.questionNo;
            return (
              <div
                key={question.id}
                id={`question-${question.questionNo}`}
                className="rounded-3xl p-3 sm:p-5 surface-card border border-border transition-all w-full min-w-0 overflow-hidden"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="rounded-full bg-orange-500/15 border border-orange-500/20 px-3 py-1 text-xs font-bold text-orange-500 shrink-0">
                      Q{listNumber}
                    </span>
                    {isRandomOrder &&
                      Number(question.questionNo) !== Number(listNumber) && (
                        <span className="rounded-full bg-muted border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                          Paper Q{question.questionNo}
                        </span>
                      )}
                    <span className="rounded-full bg-muted border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {question.topic}
                    </span>
                    <MarksBadge
                      marksPerCorrect={marks.marksPerCorrect}
                      negativeMarksPerWrong={marks.negativeMarksPerWrong}
                      unsetLabel="Marks unset"
                    />
                    {question.subtopic && (
                      <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
                        {question.subtopic}
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/cluster/${metadata.clusterId}/mock/${metadata.mockTestId}/editor?qId=${question.id}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:border-orange-500/40 hover:text-orange-500 hover:bg-orange-500/10 shrink-0"
                    title={`Edit Question ${question.questionNo} in Question Editor`}
                  >
                    <Edit2 className="h-4 w-4 text-orange-500" />
                  </Link>
                </div>

                {/* Without this provider, MathText always sees an empty
                  slot map and renders "Missing image" for every
                  ![[img:…]] marker even when question.diagramAssets is
                  populated from the API. This is the Output Visual view
                  matching the Q34 screenshot. */}
                <DiagramAssetsProvider assets={question.diagramAssets}>
                  <QuestionContent
                    text={question.text}
                    passage={question.passage}
                    textClassName="text-base sm:text-lg text-foreground break-words"
                  />

                  <div className="mt-5 grid gap-3 md:grid-cols-2 w-full min-w-0">
                    {question.questionType === "numerical" && (
                      // No options for a numerical question - the answer
                      // key is question.numericAnswer/numericTolerance
                      // (now mapped through - see mockTestHelpers.js).
                      // This tab had nothing to show here at all before.
                      <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
                        <span className="font-semibold">
                          Answer: {question.numericAnswer ?? "Not set"}
                          {question.numericTolerance
                            ? ` ± ${question.numericTolerance}`
                            : ""}
                        </span>
                      </div>
                    )}
                    {question.questionType === "fill_blank" &&
                      // Same gap as numerical - the answer key is
                      // question.acceptedAnswers: one array of acceptable
                      // strings PER BLANK, in blank order.
                      (question.acceptedAnswers?.length ? (
                        question.acceptedAnswers.map((group, blankIndex) => (
                          <div
                            key={`${question.id}-blank-${blankIndex}`}
                            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500 min-w-0"
                          >
                            <span className="font-bold">
                              Blank {blankIndex + 1}:{" "}
                            </span>
                            {(Array.isArray(group) ? group : [group]).join(
                              " / ",
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="md:col-span-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
                          No accepted answers set for this blank
                        </div>
                      ))}
                    {(question.questionType === "short_answer" ||
                      question.questionType === "long_answer") &&
                      // No options - the answer key is a rubric
                      // (question.gradingRubric: [{point, weight}]) when
                      // derivable from the paper, else a single model
                      // answer (question.expectedAnswer).
                      (question.gradingRubric?.length ? (
                        question.gradingRubric.map((entry, pointIndex) => (
                          <div
                            key={`${question.id}-rubric-${pointIndex}`}
                            className="flex items-center justify-between gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500 min-w-0"
                          >
                            <span>{entry.point}</span>
                            <span className="shrink-0 font-bold">
                              {entry.weight} pt{entry.weight === 1 ? "" : "s"}
                            </span>
                          </div>
                        ))
                      ) : question.expectedAnswer ? (
                        <div className="md:col-span-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500 whitespace-pre-wrap min-w-0">
                          <span className="font-bold">Model answer: </span>
                          {question.expectedAnswer}
                          {question.answerWordLimit
                            ? ` (~${question.answerWordLimit} words)`
                            : ""}
                        </div>
                      ) : (
                        <div className="md:col-span-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
                          No model answer or rubric set
                        </div>
                      ))}
                    {question.options.map((option, optionIndex) => {
                      const correct = option === question.answer;
                      return (
                        <div
                          key={`${question.id}-option-${optionIndex}`}
                          className={`rounded-md border px-4 py-3 text-sm whitespace-pre-wrap wrap-break-word min-w-0 overflow-x-auto scrollbar-hidden ${
                            correct
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                              : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          <MathText text={option} />
                        </div>
                      );
                    })}
                  </div>
                  <QuestionExplanation explanation={question.explanation} />
                </DiagramAssetsProvider>
              </div>
            );
          })}
          {hasMoreQuestions && (
            <div className="flex flex-col items-center gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {loadedQuestionCount} of {totalQuestionCount} questions
              </p>
              <button
                type="button"
                onClick={onLoadMoreQuestions}
                disabled={isStreamingQuestions}
                className={`inline-flex min-h-10 items-center gap-2 rounded-md border border-orange-500/30 px-4 py-2 text-sm font-semibold text-orange-600 transition-colors dark:text-orange-400 ${
                  isStreamingQuestions
                    ? "cursor-not-allowed opacity-60"
                    : "hover:bg-orange-500/10"
                }`}
              >
                {isStreamingQuestions && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {isStreamingQuestions ? "Loading..." : "Load 50 more"}
              </button>
            </div>
          )}
        </div>
      )}

      {activeView === "JSON" && (
        <pre className="overflow-x-auto rounded-3xl bg-muted border border-border p-5 text-xs leading-6 text-foreground">
          <code>{jsonContent}</code>
        </pre>
      )}

      {activeView === "Metadata" && (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(metadata).map(([key, value]) => (
            <div
              key={key}
              className="rounded-3xl p-5 surface-card border border-border"
            >
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {key}
              </div>
              <div className="mt-2 text-lg font-semibold text-foreground">
                {value}
              </div>
            </div>
          ))}
        </div>
      )}
      <ScrollToTopButton />
    </div>
  );
}
