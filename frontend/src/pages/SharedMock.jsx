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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#ea580c] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div className="text-xs font-bold text-orange-500 mb-1 uppercase tracking-wider">
              Powered by MockCraft
            </div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              {mockData.title}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              {mockData.description}
            </p>
          </div>

          <div className="surface-card rounded-3xl p-6 border border-border mb-6">
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Questions", value: mockData.totalQuestions },
                { label: "Duration", value: `${mockData.duration} min` },
                { label: "Shared by", value: mockData.sharedBy },
              ].map((s, i) => (
                <div
                  key={i}
                  className="bg-muted border border-border rounded-xl p-3 text-center"
                >
                  <div className="text-sm font-bold text-foreground">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
                Your Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name to start"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
              />
            </div>

            <button
              onClick={() => {
                if (name.trim()) setPhase("session");
              }}
              disabled={!name.trim()}
              className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-xl shadow-xs transition-all text-xs sm:text-sm disabled:opacity-40"
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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-5">
          <div className="surface-card rounded-3xl p-8 text-center border border-border">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${percentage >= 70 ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20" : "bg-amber-500/15 text-amber-500 border border-amber-500/20"}`}
            >
              {percentage >= 70 ? (
                <CheckCircle className="w-8 h-8" />
              ) : (
                <XCircle className="w-8 h-8" />
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">
              Well done, {name}!
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm mb-5">
              {mockData.title}
            </p>
            <div
              className="text-6xl font-black mb-1 text-orange-500"
            >
              {percentage}%
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium">
              {score} / {mockQuestions.length} correct
            </p>
          </div>

          <div className="surface-card rounded-3xl p-6 border border-border space-y-3">
            <h3 className="font-bold text-foreground text-sm">Answer Review</h3>
            {mockQuestions.map((q) => {
              const userAns = answers[q.id];
              const correct = userAns === q.answer;
              const skipped = userAns === undefined;
              return (
                <div
                  key={q.id}
                  className={`p-3 rounded-xl text-sm border ${correct ? "bg-emerald-500/10 border-emerald-500/30" : skipped ? "bg-card border-border" : "bg-red-500/10 border-red-500/30"}`}
                >
                  <div className="flex items-start gap-2">
                    {correct ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    ) : skipped ? (
                      <span className="w-4 h-4 rounded-full border-2 border-muted-foreground mt-0.5 shrink-0 block" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-foreground text-xs">
                        {q.text}
                      </p>
                      {!correct && !skipped && (
                        <p className="text-xs text-red-500 mt-0.5 font-semibold">
                          Your answer: {q.options[userAns]}
                        </p>
                      )}
                      {!correct && (
                        <p className="text-xs text-emerald-500 font-semibold">
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
                className="text-orange-500 font-bold hover:underline"
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
      <header className="min-h-14 bg-card/80 backdrop-blur-md border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center px-4 sm:px-6 py-3 sticky top-0 z-20">
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
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-xs ${timeLeft < 120 ? "bg-red-500/15 text-red-500 border border-red-500/20" : "bg-orange-500/15 text-orange-500 border border-orange-500/20"}`}
        >
          <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
        </div>
        <button
          onClick={handleSubmit}
          className="px-5 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-all"
        >
          Submit
        </button>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">
        <div className="surface-card rounded-3xl p-5 sm:p-6 border border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
            <span className="text-xs font-bold text-orange-500 bg-orange-500/15 border border-orange-500/20 px-3 py-1 rounded-full">
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
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${flagged.has(q.id) ? "bg-amber-500/15 text-amber-500 border-amber-500/20" : "bg-muted border-border text-muted-foreground"}`}
            >
              <Flag className="w-3.5 h-3.5" /> Flag
            </button>
          </div>
          <p className="text-base font-bold text-foreground mb-6 leading-relaxed">
            {q.text}
          </p>
          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                className={`w-full text-left px-4 py-3.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all ${answers[q.id] === i ? "border-orange-500 bg-orange-500/10 text-orange-500 font-bold" : "border-border bg-card hover:border-orange-500/40 text-foreground"}`}
              >
                <span className="font-bold text-orange-500 mr-2">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </button>
            ))}
          </div>

          {/* Question dots */}
          <div className="flex gap-1.5 flex-wrap mt-6 pt-5 border-t border-border">
            {mockQuestions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${i === current ? "bg-[#ea580c] text-white" : answers[mockQuestions[i].id] !== undefined ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground font-bold rounded-xl text-xs sm:text-sm disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() =>
                setCurrent((c) => Math.min(mockQuestions.length - 1, c + 1))
              }
              disabled={current === mockQuestions.length - 1}
              className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs disabled:opacity-40 transition-all"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
