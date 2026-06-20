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
        question: question.text,
        topic: question.topic,
        options: question.options,
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
        <div className="inline-flex rounded-2xl bg-violet-50 p-1.5 dark:bg-white/5">
          {viewTabs.map((view) => {
            const active = activeView === view;
            return (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? "gradient-violet text-white"
                    : "text-violet-700 hover:bg-white dark:text-violet-200 dark:hover:bg-white/10"
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
            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-50 dark:border-white/10 dark:bg-white/5 dark:text-violet-200 dark:hover:bg-white/10"
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-50 dark:border-white/10 dark:bg-white/5 dark:text-violet-200 dark:hover:bg-white/10"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>

      {activeView === "Visual" && (
        <div className="grid gap-4">
          {questions.map((question) => (
            <div key={question.id} className="rounded-3xl p-5 card-lavender">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-white/5 dark:text-violet-200">
                    {question.topic}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {question.text}
                  </h3>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
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
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        correct
                          ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-100"
                          : "border-violet-100 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200"
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
        <pre className="overflow-x-auto rounded-3xl bg-slate-900 p-5 text-xs leading-6 text-slate-200">
          <code>{jsonContent}</code>
        </pre>
      )}

      {activeView === "Metadata" && (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(metadata).map(([key, value]) => (
            <div key={key} className="rounded-3xl p-5 card-lavender">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {key}
              </div>
              <div className="mt-2 text-lg font-semibold text-foreground">{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
