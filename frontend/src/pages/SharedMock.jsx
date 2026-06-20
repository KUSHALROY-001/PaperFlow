import { useState, useEffect, useRef } from "react";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle,
  XCircle,
  Sparkles,
} from "lucide-react";

const mockData = {
  title: "JECA 2024 Full Paper",
  description: "Computer Science & MCA Entrance Examination",
  totalQuestions: 10,
  duration: 20,
  sharedBy: "MockCraft Team",
};

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

const TOTAL_TIME = 20 * 60;

function formatTime(secs) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function SharedMock() {
  const [phase, setPhase] = useState("intro"); // intro | session | result
  const [name, setName] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const timerRef = useRef(null);

  useEffect(() => {
    if (phase === "session") {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setPhase("result");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const q = mockQuestions[current];
  const score = mockQuestions.filter((q) => answers[q.id] === q.answer).length;
  const percentage = Math.round((score / mockQuestions.length) * 100);

  const handleSubmit = () => {
    clearInterval(timerRef.current);
    setPhase("result");
  };

  // Intro screen
  if (phase === "intro") {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 gradient-violet rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-violet-200">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div className="text-xs font-semibold text-primary mb-1">
              Powered by MockCraft
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {mockData.title}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {mockData.description}
            </p>
          </div>

          <div className="card-lavender rounded-3xl p-6 shadow-xl shadow-violet-100 mb-6">
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Questions", value: mockData.totalQuestions },
                { label: "Duration", value: `${mockData.duration} min` },
                { label: "Shared by", value: mockData.sharedBy },
              ].map((s, i) => (
                <div
                  key={i}
                  className="bg-violet-50 rounded-xl p-3 text-center"
                >
                  <div className="text-sm font-bold text-foreground">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Your Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name to start"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 transition-all"
              />
            </div>

            <button
              onClick={() => {
                if (name.trim()) setPhase("session");
              }}
              disabled={!name.trim()}
              className="w-full py-3.5 gradient-violet text-white font-bold rounded-xl shadow-lg shadow-violet-200 hover:opacity-90 transition-all disabled:opacity-40"
            >
              Start Test →
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            No account required. Your results are private.
          </p>
        </div>
      </div>
    );
  }

  // Result screen
  if (phase === "result") {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-5">
          <div className="card-lavender rounded-3xl p-8 text-center shadow-xl shadow-violet-100">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${percentage >= 70 ? "bg-emerald-100" : "bg-amber-100"}`}
            >
              {percentage >= 70 ? (
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              ) : (
                <XCircle className="w-8 h-8 text-amber-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              Well done, {name}!
            </h2>
            <p className="text-muted-foreground text-sm mb-5">
              {mockData.title}
            </p>
            <div
              className="text-6xl font-black mb-1"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {percentage}%
            </div>
            <p className="text-muted-foreground">
              {score} / {mockQuestions.length} correct
            </p>
          </div>

          <div className="card-lavender rounded-3xl p-6 shadow-xl shadow-violet-100 space-y-3">
            <h3 className="font-bold text-foreground">Answer Review</h3>
            {mockQuestions.map((q) => {
              const userAns = answers[q.id];
              const correct = userAns === q.answer;
              const skipped = userAns === undefined;
              return (
                <div
                  key={q.id}
                  className={`p-3 rounded-xl text-sm border ${correct ? "bg-emerald-50 border-emerald-200" : skipped ? "bg-gray-50 border-gray-200" : "bg-red-50 border-red-200"}`}
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
                      <p className="font-medium text-foreground text-xs">
                        {q.text}
                      </p>
                      {!correct && !skipped && (
                        <p className="text-xs text-red-500 mt-0.5">
                          Your answer: {q.options[userAns]}
                        </p>
                      )}
                      {!correct && (
                        <p className="text-xs text-emerald-600">
                          Correct: {q.options[q.answer]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Want to create your own mock tests?{" "}
              <a
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                Try MockCraft free →
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Session
  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
      <header className="min-h-14 bg-card border-b border-violet-100 flex flex-col gap-3 sm:flex-row sm:items-center px-4 sm:px-6 py-3 sticky top-0 z-20">
        <div className="flex-1">
          <div className="text-sm font-bold text-foreground">
            {mockData.title}
          </div>
          <div className="text-xs text-muted-foreground">
            {name} · {Object.keys(answers).length}/{mockQuestions.length}{" "}
            answered
          </div>
        </div>
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm ${timeLeft < 120 ? "bg-red-100 text-red-600" : "bg-violet-100 text-secondary-foreground"}`}
        >
          <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
        </div>
        <button
          onClick={handleSubmit}
          className="px-5 py-2 gradient-violet text-white font-semibold rounded-xl shadow-md shadow-violet-200 text-sm"
        >
          Submit
        </button>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">
        <div className="card-lavender rounded-3xl p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
            <span className="text-xs font-semibold text-primary bg-violet-100 px-3 py-1 rounded-full">
              Q{current + 1} of {mockQuestions.length}
            </span>
            <button
              onClick={() =>
                setFlagged((prev) => {
                  const n = new Set(prev);
                  n.has(q.id) ? n.delete(q.id) : n.add(q.id);
                  return n;
                })
              }
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl ${flagged.has(q.id) ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-muted-foreground"}`}
            >
              <Flag className="w-3 h-3" /> Flag
            </button>
          </div>
          <p className="text-base font-semibold text-foreground mb-6 leading-relaxed">
            {q.text}
          </p>
          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm font-medium transition-all ${answers[q.id] === i ? "border-violet-500 bg-violet-50 text-secondary-foreground" : "border-violet-100 bg-card hover:border-violet-300 text-foreground"}`}
              >
                <span className="font-bold text-violet-400 mr-2">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </button>
            ))}
          </div>

          {/* Question dots */}
          <div className="flex gap-1.5 flex-wrap mt-6 pt-5 border-t border-violet-100">
            {mockQuestions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${i === current ? "gradient-violet text-white" : answers[mockQuestions[i].id] !== undefined ? "bg-emerald-100 text-emerald-700" : "bg-violet-50 text-muted-foreground"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-secondary-foreground font-semibold rounded-xl text-sm disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() =>
                setCurrent((c) => Math.min(mockQuestions.length - 1, c + 1))
              }
              disabled={current === mockQuestions.length - 1}
              className="flex items-center gap-2 px-4 py-2 gradient-violet text-white font-semibold rounded-xl shadow-md shadow-violet-200 text-sm disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
