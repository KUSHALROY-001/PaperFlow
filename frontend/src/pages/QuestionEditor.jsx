import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronLeft,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  Save,
  AlertCircle,
} from "lucide-react";

const initialQuestions = [
  {
    id: 1,
    text: "Which of the following data structures uses LIFO order?",
    options: ["Queue", "Stack", "Linked List", "Tree"],
    answer: 1,
    topic: "Data Structures",
    difficulty: "Easy",
  },
  {
    id: 2,
    text: "The time complexity of binary search is:",
    options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
    answer: 2,
    topic: "Algorithms",
    difficulty: "Medium",
  },
  {
    id: 3,
    text: "Which protocol is used for secure communication over the internet?",
    options: ["HTTP", "FTP", "HTTPS", "SMTP"],
    answer: 2,
    topic: "Networking",
    difficulty: "Easy",
  },
  {
    id: 4,
    text: "What does CPU stand for?",
    options: [
      "Central Processing Unit",
      "Computer Processing Unit",
      "Core Processing Unit",
      "Central Program Unit",
    ],
    answer: 0,
    topic: "Computer Architecture",
    difficulty: "Easy",
  },
  {
    id: 5,
    text: "Which sorting algorithm has O(n log n) average time complexity?",
    options: ["Bubble Sort", "Quick Sort", "Insertion Sort", "Selection Sort"],
    answer: 1,
    topic: "Algorithms",
    difficulty: "Hard",
  },
];

const topics = [
  "Data Structures",
  "Algorithms",
  "Networking",
  "OOP",
  "Computer Architecture",
  "Databases",
  "Java",
  "OS",
];
const difficulties = ["Easy", "Medium", "Hard"];

function QuestionCard({ q, isSelected, onClick, onDelete, issues }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? "border-violet-500 bg-violet-50" : "border-violet-100 bg-card hover:border-violet-300"}`}
    >
      <div className="flex items-start gap-3">
        <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {q.text}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-lg">
              {q.topic}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-lg font-medium ${q.difficulty === "Easy" ? "bg-emerald-100 text-emerald-700" : q.difficulty === "Medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
            >
              {q.difficulty}
            </span>
            {issues > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" />
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
          className="w-7 h-7 rounded-lg hover:bg-red-100 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function QuestionEditor() {
  const { clusterId } = useParams();
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedId, setSelectedId] = useState(1);
  const [saved, setSaved] = useState(false);

  const selected = questions.find((q) => q.id === selectedId);

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

  const addOption = () => {
    if (selected.options.length >= 6) return;
    updateSelected("options", [...selected.options, ""]);
  };

  const removeOption = (i) => {
    if (selected.options.length <= 2) return;
    const opts = selected.options.filter((_, j) => j !== i);
    updateSelected("options", opts);
    if (selected.answer >= opts.length) updateSelected("answer", 0);
  };

  const addQuestion = () => {
    const newQ = {
      id: Date.now(),
      text: "New Question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      answer: 0,
      topic: "Data Structures",
      difficulty: "Easy",
    };
    setQuestions((prev) => [...prev, newQ]);
    setSelectedId(newQ.id);
  };

  const deleteQuestion = (id) => {
    const remaining = questions.filter((q) => q.id !== id);
    setQuestions(remaining);
    if (selectedId === id && remaining.length > 0)
      setSelectedId(remaining[0].id);
  };

  const getIssues = (q) => {
    let issues = 0;
    if (!q.text.trim()) issues++;
    if (q.options.some((o) => !o.trim())) issues++;
    return issues;
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row font-inter">
      {/* Left panel — question list */}
      <aside className="w-full lg:w-72 bg-card border-b lg:border-b-0 lg:border-r border-violet-100 flex flex-col lg:fixed lg:h-full z-10">
        <div className="p-4 border-b border-violet-100">
          <Link
            to={`/cluster/${clusterId || "1"}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-violet-600 mb-3 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Workspace
          </Link>
          <h2 className="text-base font-bold text-foreground">
            Question Editor
          </h2>
          <p className="text-xs text-muted-foreground">JECA 2024 Full Paper</p>
        </div>
        <div className="max-h-72 lg:max-h-none lg:flex-1 overflow-y-auto p-4 space-y-2">
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
        <div className="p-4 border-t border-violet-100">
          <button
            onClick={addQuestion}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-violet-300 text-violet-600 font-semibold rounded-xl hover:bg-violet-50 transition-all text-sm"
          >
            <Plus className="w-4 h-4" /> Add Question
          </button>
        </div>
      </aside>

      {/* Editor panel */}
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0">
        <header className="min-h-14 bg-card border-b border-violet-100 flex flex-col gap-3 sm:flex-row sm:items-center px-4 sm:px-6 py-3 sticky top-0 z-20">
          <div className="flex-1">
            <span className="text-sm font-semibold text-foreground">
              {questions.length} Questions
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              · {questions.filter((q) => getIssues(q) > 0).length} with issues
            </span>
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2 font-semibold rounded-xl text-sm transition-all ${saved ? "bg-emerald-100 text-emerald-700" : "gradient-violet text-white shadow-md shadow-violet-200 hover:opacity-90"}`}
          >
            {saved ? (
              <>
                <CheckCircle className="w-4 h-4" /> Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save All
              </>
            )}
          </button>
        </header>

        {selected && (
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto w-full space-y-6">
            {/* Question text */}
            <div className="card-lavender rounded-2xl p-6">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Question Text
              </label>
              <textarea
                value={selected.text}
                onChange={(e) => updateSelected("text", e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300 transition-all text-sm resize-none"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Topic
                  </label>
                  <select
                    value={selected.topic}
                    onChange={(e) => updateSelected("topic", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {topics.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Difficulty
                  </label>
                  <select
                    value={selected.difficulty}
                    onChange={(e) =>
                      updateSelected("difficulty", e.target.value)
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {difficulties.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="card-lavender rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-semibold text-foreground">
                  Answer Options
                </label>
                <span className="text-xs text-muted-foreground">
                  Click ✓ to mark correct answer
                </span>
              </div>
              <div className="space-y-2">
                {selected.options.map((opt, i) => (
                  <div key={i} className="flex flex-col min-[420px]:flex-row min-[420px]:items-center gap-3">
                    <button
                      onClick={() => updateSelected("answer", i)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all font-bold text-xs border-2 ${selected.answer === i ? "bg-emerald-500 border-emerald-500 text-white" : "border-border text-muted-foreground hover:border-violet-400"}`}
                    >
                      {String.fromCharCode(65 + i)}
                    </button>
                    <input
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className={`flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 transition-all ${selected.answer === i ? "border-emerald-300 bg-emerald-50" : "border-border bg-card"}`}
                    />
                    <button
                      onClick={() => removeOption(i)}
                      disabled={selected.options.length <= 2}
                      className="w-7 h-7 rounded-lg hover:bg-red-100 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addOption}
                disabled={selected.options.length >= 6}
                className="mt-3 flex items-center gap-1.5 text-xs text-violet-600 font-semibold hover:underline disabled:opacity-40 transition-all"
              >
                <Plus className="w-3 h-3" /> Add Option
              </button>
            </div>

            {/* Preview */}
            <div className="card-lavender rounded-2xl p-6 bg-violet-50/50">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Live Preview
              </div>
              <p className="text-sm font-semibold text-foreground mb-4">
                {selected.text}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selected.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`px-3 py-2.5 rounded-xl text-sm ${selected.answer === i ? "bg-emerald-100 text-emerald-700 font-semibold" : "bg-card text-foreground border border-violet-100"}`}
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
