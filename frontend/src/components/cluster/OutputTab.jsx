import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Download, Edit2, Loader2 } from "lucide-react";
import QuestionContent, {
  QuestionDiagram,
  QuestionExplanation,
} from "../shared/QuestionContent";
import MathText from "../shared/MathText";
import QuestionJumpInput from "../shared/QuestionJumpInput";
import { api } from "@/lib/api";
import ScrollToTopButton from "../shared/ScrollToTopButton";

const viewTabs = ["Visual", "JSON", "Metadata"];

export default function OutputTab({ questions, metadata, mockTestId }) {
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
    const target = questions.find((q) => q.questionNo === questionNo);
    if (!target) return false;
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
  }, [pendingScrollTo, activeView]);

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
        answer: question.answer,
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
    <div className="space-y-6 font-inter">
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
        <div className="grid gap-4">
          {questions.map((question) => (
            <div
              key={question.id}
              id={`question-${question.questionNo}`}
              className="rounded-3xl p-2.5 sm:p-5 surface-card border border-border transition-all"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="rounded-full bg-orange-500/15 border border-orange-500/20 px-3 py-1 text-xs font-bold text-orange-500 shrink-0">
                    Q{question.questionNo}
                  </span>
                  <span className="rounded-full bg-muted border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {question.topic}
                  </span>
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

              <QuestionContent
                text={question.text}
                passage={question.passage}
                diagramUrl={question.diagramUrl}
                placement={question.placement}
                textClassName="text-lg font-semibold text-foreground"
              />

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {question.options.map((option) => {
                  const correct = option === question.answer;
                  return (
                    <div
                      key={option}
                      className={`rounded-md border px-4 py-3 text-sm font-medium whitespace-pre-wrap ${
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
              {question.placement === "below_options" && (
                <div className="mt-4">
                  <QuestionDiagram diagramUrl={question.diagramUrl} />
                </div>
              )}
              <QuestionExplanation explanation={question.explanation} />
            </div>
          ))}
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
