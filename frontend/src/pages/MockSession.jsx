import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle,
  XCircle,
  BarChart2,
  Home,
} from "lucide-react";

const mockQuestions = [
  {
    id: 1,
    text: "Which of the following data structures uses LIFO order?",
    options: ["Queue", "Stack", "Linked List", "Tree"],
    answer: 1,
    topic: "Data Structures",
  },
  {
    id: 2,
    text: "The time complexity of binary search is:",
    options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
    answer: 2,
    topic: "Algorithms",
  },
  {
    id: 3,
    text: "Which protocol is used for secure communication over the internet?",
    options: ["HTTP", "FTP", "HTTPS", "SMTP"],
    answer: 2,
    topic: "Networking",
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
  },
  {
    id: 5,
    text: "Which sorting algorithm has O(n log n) average time complexity?",
    options: ["Bubble Sort", "Quick Sort", "Insertion Sort", "Selection Sort"],
    answer: 1,
    topic: "Algorithms",
  },
  {
    id: 6,
    text: "In OOP, which principle hides internal implementation details?",
    options: ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"],
    answer: 2,
    topic: "OOP",
  },
  {
    id: 7,
    text: "The OSI model has how many layers?",
    options: ["5", "6", "7", "8"],
    answer: 2,
    topic: "Networking",
  },
  {
    id: 8,
    text: "Which data structure is used for BFS traversal?",
    options: ["Stack", "Queue", "Heap", "Tree"],
    answer: 1,
    topic: "Data Structures",
  },
  {
    id: 9,
    text: "What is the full form of SQL?",
    options: [
      "Structured Query Language",
      "Simple Query Language",
      "Standard Query Logic",
      "Sequential Query Language",
    ],
    answer: 0,
    topic: "Databases",
  },
  {
    id: 10,
    text: "Which of the following is NOT a primitive data type in Java?",
    options: ["int", "boolean", "String", "char"],
    answer: 2,
    topic: "Java",
  },
];

const TOTAL_TIME = 20 * 60; // 20 minutes in seconds

function formatTime(secs) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function MockSession() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setSubmitted(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const q = mockQuestions[current];
  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / mockQuestions.length) * 100);

  const handleAnswer = (idx) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [q.id]: idx }));
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const n = new Set(prev);
      n.has(q.id) ? n.delete(q.id) : n.add(q.id);
      return n;
    });
  };

  const handleSubmit = () => {
    clearInterval(timerRef.current);
    setSubmitted(true);
  };

  // Score calculation
  const score = submitted
    ? mockQuestions.filter((q) => answers[q.id] === q.answer).length
    : 0;
  const percentage = submitted
    ? Math.round((score / mockQuestions.length) * 100)
    : 0;

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-6">
          <div className="card-lavender rounded-3xl p-8 text-center">
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 ${percentage >= 70 ? "bg-emerald-100" : "bg-amber-100"}`}
            >
              {percentage >= 70 ? (
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              ) : (
                <BarChart2 className="w-10 h-10 text-amber-600" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Session Complete!
            </h1>
            <p className="text-muted-foreground mb-6">
              JECA 2024 Full Paper — Mock Test
            </p>
            <div
              className="text-6xl font-black mb-2"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {percentage}%
            </div>
            <p className="text-muted-foreground mb-8">
              {score} / {mockQuestions.length} correct
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                {
                  label: "Correct",
                  value: score,
                  color: "bg-emerald-100 text-emerald-700",
                },
                {
                  label: "Wrong",
                  value:
                    mockQuestions.length -
                    score -
                    (mockQuestions.length - answered),
                  color: "bg-red-100 text-red-700",
                },
                {
                  label: "Skipped",
                  value: mockQuestions.length - answered,
                  color: "bg-gray-100 text-gray-600",
                },
              ].map((s, i) => (
                <div key={i} className={`rounded-2xl p-4 ${s.color}`}>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs font-medium">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-3 text-left mb-8">
              {mockQuestions.map((q) => {
                const userAns = answers[q.id];
                const correct = userAns === q.answer;
                const skipped = userAns === undefined;
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border text-sm ${correct ? "bg-emerald-50 border-emerald-200" : skipped ? "bg-gray-50 border-gray-200" : "bg-red-50 border-red-200"}`}
                  >
                    <div className="flex items-start gap-2">
                      {correct ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      ) : skipped ? (
                        <span className="w-4 h-4 rounded-full border-2 border-gray-400 mt-0.5 shrink-0 block" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{q.text}</p>
                        {!correct && !skipped && (
                          <p className="text-xs text-red-500 mt-1">
                            Your answer: {q.options[userAns]}
                          </p>
                        )}
                        {!correct && (
                          <p className="text-xs text-emerald-600 mt-0.5">
                            Correct: {q.options[q.answer]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 justify-center">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-6 py-3 bg-card border border-border text-foreground font-semibold rounded-xl hover:bg-secondary transition-all text-sm"
              >
                <Home className="w-4 h-4" /> Dashboard
              </Link>
              <Link
                to="/clusters"
                className="flex items-center gap-2 px-6 py-3 gradient-violet text-white font-semibold rounded-xl shadow-lg shadow-violet-200 hover:opacity-90 transition-all text-sm"
              >
                View Clusters
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row font-inter">
      {/* Sidebar navigator */}
      <aside className="w-full lg:w-56 bg-card border-b lg:border-b-0 lg:border-r border-border flex flex-col p-4 lg:fixed lg:h-full z-10">
        <div className="mb-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Exit Session
          </Link>
        </div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Questions
        </div>
        <div className="grid grid-cols-10 lg:grid-cols-5 gap-1.5 lg:flex-1">
          {mockQuestions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrent(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                i === current
                  ? "gradient-violet text-white shadow-md shadow-violet-200"
                  : answers[q.id] !== undefined
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : flagged.has(q.id)
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      : "bg-secondary text-muted-foreground hover:bg-accent"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-100 inline-block" />
            <span className="text-muted-foreground">Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-100 inline-block" />
            <span className="text-muted-foreground">Flagged</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-secondary inline-block" />
            <span className="text-muted-foreground">Not visited</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-56 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="min-h-14 bg-card border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center px-4 sm:px-6 py-3 sticky top-0 z-20">
          <div className="flex-1">
            <div className="text-sm font-bold text-foreground">
              JECA 2024 Full Paper
            </div>
            <div className="text-xs text-muted-foreground">
              {answered}/{mockQuestions.length} answered
            </div>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm ${timeLeft < 120 ? "bg-red-100 text-red-600" : "bg-violet-100 text-violet-700"}`}
          >
            <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
          </div>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 gradient-violet text-white font-semibold rounded-xl shadow-md shadow-violet-200 hover:opacity-90 transition-all text-sm"
          >
            Submit
          </button>
        </header>

        {/* Question */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
          <div className="card-lavender rounded-3xl p-5 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary bg-secondary px-3 py-1 rounded-full">
                  Q{current + 1} of {mockQuestions.length}
                </span>
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {q.topic}
                </span>
              </div>
              <button
                onClick={toggleFlag}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${flagged.has(q.id) ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" : "bg-muted text-muted-foreground hover:text-amber-600 hover:bg-amber-50"}`}
              >
                <Flag className="w-3 h-3" />{" "}
                {flagged.has(q.id) ? "Flagged" : "Flag"}
              </button>
            </div>

            <p className="text-lg font-semibold text-foreground mb-8 leading-relaxed">
              {q.text}
            </p>

            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-medium text-sm transition-all ${
                    answers[q.id] === i
                      ? "border-primary bg-secondary text-secondary-foreground"
                      : "border-border bg-card hover:border-input hover:bg-secondary text-foreground"
                  }`}
                >
                  <span className="font-bold text-violet-400 mr-3">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-8 pt-6 border-t border-border">
              <button
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-card border border-border text-foreground font-semibold rounded-xl hover:bg-secondary transition-all text-sm disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <div className="text-xs text-muted-foreground">
                {progress}% complete
              </div>
              <button
                onClick={() =>
                  setCurrent((c) => Math.min(mockQuestions.length - 1, c + 1))
                }
                disabled={current === mockQuestions.length - 1}
                className="flex items-center gap-2 px-5 py-2.5 gradient-violet text-white font-semibold rounded-xl shadow-md shadow-violet-200 hover:opacity-90 transition-all text-sm disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
