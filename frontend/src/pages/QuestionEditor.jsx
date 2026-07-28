import { ChevronLeft, Plus, Trash2, Save, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuestionEditor } from "@/hooks/useQuestionEditor";
import { topics } from "@/utils/questionEditorHelpers";
import QuestionCard from "../components/question-editor/QuestionCard";

export default function QuestionEditor() {
  const {
    clusterId,
    mockTestId,
    questions,
    selected,
    selectedId,
    setSelectedId,
    saved,
    error,
    isSaving,
    isLoading,
    issuesById,
    issueCount,
    updateSelected,
    updateOption,
    setCorrectOption,
    addOption,
    removeOption,
    addQuestion,
    deleteQuestion,
    handleSave,
  } = useQuestionEditor();

  if (!mockTestId) {
    return (
      <div className="surface-card rounded-2xl p-8 border border-border">
        <p className="font-bold text-foreground">Select a mock test first.</p>
        <Link
          to={`/cluster/${clusterId}`}
          className="mt-4 inline-flex rounded-xl bg-[#ea580c] hover:bg-[#c2410c] px-4 py-2 text-sm font-bold text-white shadow-xs"
        >
          Back to Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row font-inter">
      <aside className="w-full lg:w-72 bg-card border-b lg:border-b-0 lg:border-r border-border flex flex-col lg:fixed lg:h-full z-10">
        <div className="p-4 border-b border-border">
          <Link
            to={`/cluster/${clusterId}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-orange-500 mb-3 transition-colors font-medium"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Workspace
          </Link>
          <h2 className="text-base font-extrabold text-foreground tracking-tight">
            Question Editor
          </h2>
          <p className="text-xs text-muted-foreground">
            Manual mock test question entry
          </p>
        </div>

        <div className="max-h-72 lg:max-h-none lg:flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && (
            <div className="text-sm text-muted-foreground">
              Loading questions...
            </div>
          )}
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              isSelected={q.id === selectedId}
              onSelect={setSelectedId}
              onDelete={deleteQuestion}
              issues={issuesById.get(q.id)}
            />
          ))}
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={addQuestion}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-orange-500/40 text-orange-500 font-bold rounded-xl hover:bg-orange-500/10 transition-all text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" /> Add Question
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-72 flex flex-col min-w-0">
        <header className="min-h-14 bg-card/80 backdrop-blur-md border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center px-4 sm:px-6 py-3 sticky top-0 z-20">
          <div className="flex-1">
            <span className="text-sm font-bold text-foreground">
              {questions.length} Questions
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              {issueCount} with issues
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addQuestion}
              className="hidden lg:inline-flex items-center gap-2 px-4 py-2 font-bold rounded-xl text-xs sm:text-sm bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" /> Add Question
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || questions.length === 0}
              className={`flex items-center gap-2 px-5 py-2 font-bold rounded-xl text-xs sm:text-sm transition-all disabled:opacity-60 ${saved ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs"}`}
            >
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />{" "}
                  {isSaving ? "Saving..." : "Save All"}
                </>
              )}
            </button>
          </div>
        </header>

        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500 sm:mx-6 lg:mx-8">
            {error}
          </div>
        )}

        {!selected && !isLoading && (
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto w-full">
            <div className="surface-card rounded-2xl p-8 text-center border border-border">
              <p className="font-bold text-foreground">No questions yet</p>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Add a question to begin building this mock test manually.
              </p>
              <button
                onClick={addQuestion}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs"
              >
                <Plus className="h-4 w-4" /> Add Question
              </button>
            </div>
          </main>
        )}

        {selected && (
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto w-full space-y-6">
            <div className="surface-card rounded-2xl p-6 border border-border">
              <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                    Question No
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={selected.questionNo}
                    onChange={(e) =>
                      updateSelected("questionNo", e.target.value)
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                    Topic
                  </label>
                  <select
                    value={selected.topic}
                    onChange={(e) => updateSelected("topic", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  >
                    {topics.map((topic) => (
                      <option key={topic}>{topic}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
                Question Text
              </label>
              <textarea
                value={selected.text}
                onChange={(e) => updateSelected("text", e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all text-xs sm:text-sm resize-none"
              />
            </div>

            <div className="surface-card rounded-2xl p-6 border border-border">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <label className="text-xs sm:text-sm font-bold text-foreground">
                  Answer Options
                </label>
                <select
                  value={selected.questionType}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    updateSelected("questionType", nextType);
                    if (nextType === "single") {
                      updateSelected("correctOptionIndexes", [
                        selected.correctOptionIndexes[0] || 0,
                      ]);
                    }
                  }}
                  className="w-full sm:w-36 rounded-xl border border-border bg-card text-foreground px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
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
                      className="flex flex-col min-[420px]:flex-row min-[420px]:items-center gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => setCorrectOption(i)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all font-bold text-xs border-2 ${isCorrect ? "bg-emerald-500 border-emerald-500 text-white" : "border-border text-muted-foreground hover:border-orange-500/40"}`}
                      >
                        {String.fromCharCode(65 + i)}
                      </button>
                      <input
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        className={`flex-1 px-4 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all ${isCorrect ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-bold" : "border-border bg-card text-foreground"}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        disabled={selected.options.length <= 2}
                        className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={addOption}
                disabled={selected.options.length >= 6}
                className="mt-3 flex items-center gap-1.5 text-xs text-orange-500 font-bold hover:underline disabled:opacity-40 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Option
              </button>
            </div>

            <div className="surface-card rounded-2xl p-6 border border-border bg-muted/30">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                Live Preview
              </div>
              <p className="text-sm font-bold text-foreground mb-4">
                {selected.text}
              </p>
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
        )}
      </div>
    </div>
  );
}
