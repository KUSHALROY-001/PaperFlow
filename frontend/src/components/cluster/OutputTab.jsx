import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Download } from "lucide-react";

const viewTabs = ["Visual", "JSON", "Metadata"];

export default function OutputTab({ questions, metadata }) {
  const [activeView, setActiveView] = useState("Visual");
  const [copied, setCopied] = useState(false);

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

  const handleDownload = () => {
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${metadata.clusterId}-mockcraft.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex max-w-full rounded-2xl bg-muted/60 p-1.5 border border-border">
          {viewTabs.map((view) => {
            const active = activeView === view;
            return (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`rounded-xl px-3 py-2 text-xs sm:px-4 sm:text-sm font-semibold transition-all ${
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

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted"
          >
            <Copy className="h-4 w-4 text-orange-500" />
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted"
          >
            <Download className="h-4 w-4 text-orange-500" />
            Download
          </button>
        </div>
      </div>

      {activeView === "Visual" && (
        <div className="grid gap-4">
          {questions.map((question) => (
            <div
              key={question.id}
              className="rounded-3xl p-5 surface-card border border-border"
            >
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
                    {question.topic}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {question.text}
                  </h3>
                </div>
                <div className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Correct option highlighted
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {question.options.map((option) => {
                  const correct = option === question.answer;
                  return (
                    <div
                      key={option}
                      className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                        correct
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {option}
                    </div>
                  );
                })}
              </div>
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
    </div>
  );
}
