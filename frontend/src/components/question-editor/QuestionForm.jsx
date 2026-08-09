import { Plus, Trash2 } from "lucide-react";
import { resolveAssetUrl } from "@/lib/api";

export default function QuestionForm({
  selected,
  extractedTopics,
  isCustomTopic,
  setIsCustomTopic,
  updateSelected,
  updateOption,
  setCorrectOption,
  addOption,
  removeOption,
  isViewer,
}) {
  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto w-full space-y-6">
      <div className="surface-card rounded-2xl p-3 sm:p-6 border border-border">
        <div className="mb-4">
          <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
            Topic
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              disabled={isViewer}
              value={
                extractedTopics.includes(selected.topic) && !isCustomTopic
                  ? selected.topic
                  : "custom"
              }
              onChange={(e) => {
                if (isViewer) return;
                const val = e.target.value;
                if (val === "custom") {
                  setIsCustomTopic(true);
                } else {
                  setIsCustomTopic(false);
                  updateSelected("topic", val);
                }
              }}
              className={`flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                isViewer ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              {extractedTopics.length === 0 ? (
                <option value="General">General</option>
              ) : (
                extractedTopics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))
              )}
              <option value="custom">✍️ Custom Topic...</option>
            </select>

            {(!extractedTopics.includes(selected.topic) || isCustomTopic) && (
              <input
                type="text"
                disabled={isViewer}
                value={selected.topic}
                onChange={(e) =>
                  !isViewer && updateSelected("topic", e.target.value)
                }
                placeholder="Enter topic name..."
                className={`flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                  isViewer ? "cursor-not-allowed opacity-60" : ""
                }`}
              />
            )}
          </div>
        </div>

        <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
          Question Text
        </label>
        <textarea
          disabled={isViewer}
          value={selected.text}
          onChange={(e) => !isViewer && updateSelected("text", e.target.value)}
          rows={3}
          className={`w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all text-xs sm:text-sm resize-none ${
            isViewer ? "cursor-not-allowed opacity-60" : ""
          }`}
        />
      </div>

      <div className="surface-card rounded-2xl p-3 sm:p-6 border border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <label className="text-xs sm:text-sm font-bold text-foreground">
            Answer Options
          </label>
          <select
            disabled={isViewer}
            value={selected.questionType}
            onChange={(event) => {
              if (isViewer) return;
              const nextType = event.target.value;
              updateSelected("questionType", nextType);
              if (nextType === "single") {
                updateSelected("correctOptionIndexes", [
                  selected.correctOptionIndexes[0] || 0,
                ]);
              }
            }}
            className={`w-full sm:w-36 rounded-xl border border-border bg-card text-foreground px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
              isViewer ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <option value="single">Single</option>
            <option value="multi">Multi</option>
          </select>
        </div>

        <div className="space-y-2">
          {selected.options.map((opt, i) => {
            const isCorrect = selected.correctOptionIndexes.includes(i);

            return (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-0 rounded-2xl sm:rounded-none bg-card/50 sm:bg-transparent border sm:border-0 border-border/60"
              >
                <div className="flex items-center justify-between sm:contents">
                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={() => !isViewer && setCorrectOption(i)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all font-bold text-xs border-2 ${
                      isViewer
                        ? "cursor-not-allowed opacity-50 border-border text-muted-foreground"
                        : isCorrect
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-border text-muted-foreground hover:border-orange-500/40"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </button>
                  <button
                    type="button"
                    disabled={isViewer || selected.options.length <= 2}
                    onClick={() => !isViewer && removeOption(i)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 sm:order-last ${
                      isViewer
                        ? "cursor-not-allowed text-muted-foreground/30"
                        : "hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                    }`}
                    title="Delete Option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <input
                  disabled={isViewer}
                  value={opt}
                  onChange={(e) => !isViewer && updateOption(i, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  className={`w-full sm:flex-1 px-4 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all ${
                    isViewer
                      ? "cursor-not-allowed opacity-60 border-border bg-card text-foreground"
                      : isCorrect
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-bold"
                        : "border-border bg-card text-foreground"
                  }`}
                />
              </div>
            );
          })}
        </div>
        <button
          type="button"
          disabled={isViewer || selected.options.length >= 6}
          onClick={() => !isViewer && addOption()}
          className={`mt-3 flex items-center gap-1.5 text-xs font-bold transition-all ${
            isViewer
              ? "text-muted-foreground/40 cursor-not-allowed opacity-50"
              : "text-orange-500 hover:underline"
          }`}
        >
          <Plus className="w-3.5 h-3.5" /> Add Option
        </button>
      </div>

      <div className="surface-card rounded-2xl p-3 sm:p-6 border border-border bg-muted/30">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
          Live Preview
        </div>
        <p className="text-sm font-bold text-foreground mb-4">
          {selected.text}
        </p>
        {selected.diagramUrl && (
          <img
            src={resolveAssetUrl(selected.diagramUrl)}
            alt="Question diagram"
            className="max-w-full rounded-xl border border-border mb-4"
            loading="lazy"
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {selected.options.map((opt, i) => (
            <div
              key={i}
              className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm ${selected.correctOptionIndexes.includes(i) ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 font-bold" : "bg-card text-foreground border border-border"}`}
            >
              <span className="font-bold mr-2">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
