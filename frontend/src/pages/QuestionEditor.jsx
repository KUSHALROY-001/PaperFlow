import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  Save,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";

const topics = [
  "Data Structures",
  "Algorithms",
  "Networking",
  "OOP",
  "Computer Architecture",
  "Databases",
  "Java",
  "OS",
  "C Programming",
];

function toEditorQuestion(question) {
  const options = question.options?.map((option) => option.optionText) || [];

  return {
    id: question.id,
    persisted: true,
    questionNo: question.question_no,
    text: question.question_text,
    options,
    correctOptionIndexes: question.correct_option_indexes || [0],
    topic: question.topic || "Data Structures",
    questionType: question.question_type || "single",
  };
}

function QuestionCard({ q, isSelected, onClick, onDelete, issues }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border cursor-pointer transition-all ${isSelected ? "border-orange-500 bg-orange-500/10 dark:bg-orange-500/15" : "border-border bg-card hover:border-orange-500/40"}`}
    >
      <div className="flex items-start gap-3">
        <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-bold text-foreground truncate">
            {q.text}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-lg font-bold">
              Q{q.questionNo}
            </span>
            <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-lg font-bold">
              {q.topic}
            </span>
            {!q.persisted && (
              <span className="text-xs bg-amber-500/15 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-lg font-bold">
                Draft
              </span>
            )}
            {issues > 0 && (
              <span className="text-xs bg-red-500/15 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {issues} issue{issues > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(q.id);
          }}
          className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function QuestionEditor() {
  const { clusterId, mockTestId } = useParams();
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const questionsQuery = useQuery({
    queryKey: ["questions", mockTestId],
    queryFn: () => api.listQuestions(mockTestId),
    enabled: Boolean(mockTestId),
  });

  useEffect(() => {
    if (!questionsQuery.data?.questions) return;
    const loaded = questionsQuery.data.questions.map(toEditorQuestion);
    setQuestions(loaded);
    setSelectedId((current) =>
      loaded.some((question) => question.id === current)
        ? current
        : loaded[0]?.id || "",
    );
  }, [questionsQuery.data]);

  const selected = questions.find((q) => q.id === selectedId);

  const nextQuestionNo = useMemo(
    () => Math.max(0, ...questions.map((question) => Number(question.questionNo) || 0)) + 1,
    [questions],
  );

  const updateSelected = (field, value) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === selectedId ? { ...q, [field]: value } : q)),
    );
  };

  const updateOption = (i, value) => {
    const opts = [...selected.options];
    opts[i] = value;
    updateSelected("options", opts);
  };

  const setCorrectOption = (index) => {
    if (selected.questionType === "multi") {
      const current = new Set(selected.correctOptionIndexes);
      if (current.has(index)) {
        current.delete(index);
      } else {
        current.add(index);
      }
      updateSelected("correctOptionIndexes", [...current].sort((a, b) => a - b));
      return;
    }

    updateSelected("correctOptionIndexes", [index]);
  };

  const addOption = () => {
    if (!selected || selected.options.length >= 6) return;
    updateSelected("options", [...selected.options, ""]);
  };

  const removeOption = (i) => {
    if (!selected || selected.options.length <= 2) return;
    const opts = selected.options.filter((_, j) => j !== i);
    const corrected = selected.correctOptionIndexes
      .filter((index) => index !== i)
      .map((index) => (index > i ? index - 1 : index));

    updateSelected("options", opts);
    updateSelected("correctOptionIndexes", corrected.length ? corrected : [0]);
  };

  const addQuestion = () => {
    const newQ = {
      id: `draft-${Date.now()}`,
      persisted: false,
      questionNo: nextQuestionNo,
      text: "New Question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctOptionIndexes: [0],
      topic: "Data Structures",
      questionType: "single",
    };
    setQuestions((prev) => [...prev, newQ]);
    setSelectedId(newQ.id);
  };

  const deleteQuestion = async (id) => {
    const target = questions.find((question) => question.id === id);

    try {
      if (target?.persisted) {
        await api.deleteQuestion(id);
        await queryClient.invalidateQueries({ queryKey: ["questions", mockTestId] });
        await queryClient.invalidateQueries({ queryKey: ["mock-tests", clusterId] });
      }

      const remaining = questions.filter((q) => q.id !== id);
      setQuestions(remaining);
      if (selectedId === id) {
        setSelectedId(remaining[0]?.id || "");
      }
    } catch (err) {
      setError(err.message || "Could not delete question");
    }
  };

  const getIssues = (q) => {
    let issues = 0;
    if (!q.text.trim()) issues++;
    if (q.options.length < 2) issues++;
    if (q.options.some((o) => !o.trim())) issues++;
    if (!q.correctOptionIndexes.length) issues++;
    return issues;
  };

  const saveQuestion = async (question) => {
    const payload = {
      mockTestId,
      questionNo: Number(question.questionNo),
      topic: question.topic,
      questionText: question.text,
      options: question.options,
      correctOptionIndexes: question.correctOptionIndexes,
      questionType: question.questionType,
      status: "approved",
    };

    if (question.persisted) {
      return api.updateQuestion(question.id, payload);
    }

    return api.createQuestion(payload);
  };

  const handleSave = async () => {
    setError("");
    setIsSaving(true);

    try {
      const invalid = questions.find((question) => getIssues(question) > 0);
      if (invalid) {
        throw new Error("Fix question issues before saving");
      }

      for (const question of questions) {
        await saveQuestion(question);
      }

      await queryClient.invalidateQueries({ queryKey: ["questions", mockTestId] });
      await queryClient.invalidateQueries({ queryKey: ["mock-tests", clusterId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Could not save questions");
    } finally {
      setIsSaving(false);
    }
  };

  if (!mockTestId) {
    return (
      <div className="surface-card rounded-2xl p-8 border border-border">
        <p className="font-bold text-foreground">Select a mock test first.</p>
        <Link to={`/cluster/${clusterId}`} className="mt-4 inline-flex rounded-xl bg-[#ea580c] hover:bg-[#c2410c] px-4 py-2 text-sm font-bold text-white shadow-xs">
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
          <h2 className="text-base font-extrabold text-foreground tracking-tight">Question Editor</h2>
          <p className="text-xs text-muted-foreground">Manual mock test question entry</p>
        </div>

        <div className="max-h-72 lg:max-h-none lg:flex-1 overflow-y-auto p-4 space-y-2">
          {questionsQuery.isLoading && (
            <div className="text-sm text-muted-foreground">Loading questions...</div>
          )}
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              isSelected={q.id === selectedId}
              onClick={() => setSelectedId(q.id)}
              onDelete={deleteQuestion}
              issues={getIssues(q)}
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
              {questions.filter((q) => getIssues(q) > 0).length} with issues
            </span>
          </div>
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
                <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save All"}
              </>
            )}
          </button>
        </header>

        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500 sm:mx-6 lg:mx-8">
            {error}
          </div>
        )}

        {!selected && !questionsQuery.isLoading && (
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
                    onChange={(e) => updateSelected("questionNo", e.target.value)}
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
                      updateSelected("correctOptionIndexes", [selected.correctOptionIndexes[0] || 0]);
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
                    <div key={i} className="flex flex-col min-[420px]:flex-row min-[420px]:items-center gap-3">
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
