import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  BarChart2,
  TrendingUp,
  Target,
  Award,
} from "lucide-react";

const mockHistory = [
  {
    id: 1,
    title: "JECA 2024 Full Paper",
    date: "May 24, 2026",
    time: "10:42 AM",
    score: 8,
    total: 10,
    timeTaken: "14m 32s",
    topics: {
      "Data Structures": { correct: 2, total: 2 },
      Algorithms: { correct: 2, total: 2 },
      Networking: { correct: 1, total: 2 },
      OOP: { correct: 1, total: 1 },
      Databases: { correct: 1, total: 1 },
      Java: { correct: 1, total: 1 },
    },
    questions: [
      {
        text: "Which of the following data structures uses LIFO order?",
        options: ["Queue", "Stack", "Linked List", "Tree"],
        userAnswer: 1,
        correctAnswer: 1,
        topic: "Data Structures",
      },
      {
        text: "The time complexity of binary search is:",
        options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
        userAnswer: 2,
        correctAnswer: 2,
        topic: "Algorithms",
      },
      {
        text: "Which protocol is used for secure communication over the internet?",
        options: ["HTTP", "FTP", "HTTPS", "SMTP"],
        userAnswer: 0,
        correctAnswer: 2,
        topic: "Networking",
      },
      {
        text: "What does CPU stand for?",
        options: [
          "Central Processing Unit",
          "Computer Processing Unit",
          "Core Processing Unit",
          "Central Program Unit",
        ],
        userAnswer: 0,
        correctAnswer: 0,
        topic: "Computer Architecture",
      },
      {
        text: "Which sorting algorithm has O(n log n) average time complexity?",
        options: [
          "Bubble Sort",
          "Quick Sort",
          "Insertion Sort",
          "Selection Sort",
        ],
        userAnswer: 1,
        correctAnswer: 1,
        topic: "Algorithms",
      },
      {
        text: "In OOP, which principle hides internal implementation details?",
        options: [
          "Inheritance",
          "Polymorphism",
          "Encapsulation",
          "Abstraction",
        ],
        userAnswer: 2,
        correctAnswer: 2,
        topic: "OOP",
      },
      {
        text: "The OSI model has how many layers?",
        options: ["5", "6", "7", "8"],
        userAnswer: 1,
        correctAnswer: 2,
        topic: "Networking",
      },
      {
        text: "Which data structure is used for BFS traversal?",
        options: ["Stack", "Queue", "Heap", "Tree"],
        userAnswer: 1,
        correctAnswer: 1,
        topic: "Data Structures",
      },
      {
        text: "What is the full form of SQL?",
        options: [
          "Structured Query Language",
          "Simple Query Language",
          "Standard Query Logic",
          "Sequential Query Language",
        ],
        userAnswer: 0,
        correctAnswer: 0,
        topic: "Databases",
      },
      {
        text: "Which of the following is NOT a primitive data type in Java?",
        options: ["int", "boolean", "String", "char"],
        userAnswer: 2,
        correctAnswer: 2,
        topic: "Java",
      },
    ],
  },
  {
    id: 2,
    title: "JECA 2024 Full Paper",
    date: "May 22, 2026",
    time: "3:15 PM",
    score: 6,
    total: 10,
    timeTaken: "18m 05s",
    topics: {
      "Data Structures": { correct: 1, total: 2 },
      Algorithms: { correct: 2, total: 2 },
      Networking: { correct: 1, total: 2 },
      OOP: { correct: 1, total: 1 },
      Databases: { correct: 0, total: 1 },
      Java: { correct: 1, total: 1 },
    },
    questions: [
      {
        text: "Which of the following data structures uses LIFO order?",
        options: ["Queue", "Stack", "Linked List", "Tree"],
        userAnswer: 0,
        correctAnswer: 1,
        topic: "Data Structures",
      },
      {
        text: "The time complexity of binary search is:",
        options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
        userAnswer: 2,
        correctAnswer: 2,
        topic: "Algorithms",
      },
      {
        text: "Which protocol is used for secure communication over the internet?",
        options: ["HTTP", "FTP", "HTTPS", "SMTP"],
        userAnswer: 2,
        correctAnswer: 2,
        topic: "Networking",
      },
      {
        text: "What does CPU stand for?",
        options: [
          "Central Processing Unit",
          "Computer Processing Unit",
          "Core Processing Unit",
          "Central Program Unit",
        ],
        userAnswer: 0,
        correctAnswer: 0,
        topic: "Computer Architecture",
      },
      {
        text: "Which sorting algorithm has O(n log n) average time complexity?",
        options: [
          "Bubble Sort",
          "Quick Sort",
          "Insertion Sort",
          "Selection Sort",
        ],
        userAnswer: 1,
        correctAnswer: 1,
        topic: "Algorithms",
      },
      {
        text: "In OOP, which principle hides internal implementation details?",
        options: [
          "Inheritance",
          "Polymorphism",
          "Encapsulation",
          "Abstraction",
        ],
        userAnswer: 2,
        correctAnswer: 2,
        topic: "OOP",
      },
      {
        text: "The OSI model has how many layers?",
        options: ["5", "6", "7", "8"],
        userAnswer: 2,
        correctAnswer: 2,
        topic: "Networking",
      },
      {
        text: "Which data structure is used for BFS traversal?",
        options: ["Stack", "Queue", "Heap", "Tree"],
        userAnswer: 0,
        correctAnswer: 1,
        topic: "Data Structures",
      },
      {
        text: "What is the full form of SQL?",
        options: [
          "Structured Query Language",
          "Simple Query Language",
          "Standard Query Logic",
          "Sequential Query Language",
        ],
        userAnswer: 1,
        correctAnswer: 0,
        topic: "Databases",
      },
      {
        text: "Which of the following is NOT a primitive data type in Java?",
        options: ["int", "boolean", "String", "char"],
        userAnswer: 2,
        correctAnswer: 2,
        topic: "Java",
      },
    ],
  },
  {
    id: 3,
    title: "GATE CS 2023",
    date: "May 20, 2026",
    time: "11:00 AM",
    score: 5,
    total: 10,
    timeTaken: "20m 00s",
    topics: {
      "Data Structures": { correct: 1, total: 2 },
      Algorithms: { correct: 1, total: 2 },
      Networking: { correct: 1, total: 2 },
      OOP: { correct: 1, total: 1 },
      Databases: { correct: 1, total: 1 },
      Java: { correct: 0, total: 1 },
    },
    questions: [
      {
        text: "Which of the following data structures uses LIFO order?",
        options: ["Queue", "Stack", "Linked List", "Tree"],
        userAnswer: 1,
        correctAnswer: 1,
        topic: "Data Structures",
      },
      {
        text: "The time complexity of binary search is:",
        options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
        userAnswer: 0,
        correctAnswer: 2,
        topic: "Algorithms",
      },
      {
        text: "Which protocol is used for secure communication over the internet?",
        options: ["HTTP", "FTP", "HTTPS", "SMTP"],
        userAnswer: 2,
        correctAnswer: 2,
        topic: "Networking",
      },
      {
        text: "What does CPU stand for?",
        options: [
          "Central Processing Unit",
          "Computer Processing Unit",
          "Core Processing Unit",
          "Central Program Unit",
        ],
        userAnswer: 0,
        correctAnswer: 0,
        topic: "Computer Architecture",
      },
      {
        text: "Which sorting algorithm has O(n log n) average time complexity?",
        options: [
          "Bubble Sort",
          "Quick Sort",
          "Insertion Sort",
          "Selection Sort",
        ],
        userAnswer: 3,
        correctAnswer: 1,
        topic: "Algorithms",
      },
      {
        text: "In OOP, which principle hides internal implementation details?",
        options: [
          "Inheritance",
          "Polymorphism",
          "Encapsulation",
          "Abstraction",
        ],
        userAnswer: 2,
        correctAnswer: 2,
        topic: "OOP",
      },
      {
        text: "The OSI model has how many layers?",
        options: ["5", "6", "7", "8"],
        userAnswer: 2,
        correctAnswer: 2,
        topic: "Networking",
      },
      {
        text: "Which data structure is used for BFS traversal?",
        options: ["Stack", "Queue", "Heap", "Tree"],
        userAnswer: 0,
        correctAnswer: 1,
        topic: "Data Structures",
      },
      {
        text: "What is the full form of SQL?",
        options: [
          "Structured Query Language",
          "Simple Query Language",
          "Standard Query Logic",
          "Sequential Query Language",
        ],
        userAnswer: 0,
        correctAnswer: 0,
        topic: "Databases",
      },
      {
        text: "Which of the following is NOT a primitive data type in Java?",
        options: ["int", "boolean", "String", "char"],
        userAnswer: 0,
        correctAnswer: 2,
        topic: "Java",
      },
    ],
  },
];

function AttemptCard({ attempt }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round((attempt.score / attempt.total) * 100);

  return (
    <div className="surface-card rounded-2xl border border-border overflow-hidden">
      {/* Header row */}
      <div className="p-5 flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${pct >= 80 ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20" : pct >= 60 ? "bg-amber-500/15 text-amber-500 border border-amber-500/20" : "bg-red-500/15 text-red-500 border border-red-500/20"}`}
        >
          <span
            className="text-lg font-black"
          >
            {pct}%
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground">{attempt.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {attempt.date} · {attempt.time} · {attempt.timeTaken}
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden w-48">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background:
                  pct >= 80 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444",
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-lg font-bold text-foreground">
              {attempt.score}/{attempt.total}
            </div>
            <div className="text-xs text-muted-foreground font-medium">correct</div>
          </div>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-orange-500 hover:border-orange-500/40 transition-all"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border p-5 space-y-5 bg-muted/40">
          {/* Topic breakdown */}
          <div>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Topic Breakdown
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(attempt.topics).map(
                ([topic, { correct, total }]) => (
                  <div
                    key={topic}
                    className="bg-card rounded-xl p-3 border border-border"
                  >
                    <div className="text-xs font-bold text-foreground mb-1">
                      {topic}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-1.5 flex-1 mr-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((correct / total) * 100)}%`,
                            background:
                              correct === total ? "#10B981" : "#ea580c",
                          }}
                        />
                      </div>
                      <span
                        className={`text-xs font-bold ${correct === total ? "text-emerald-500" : correct === 0 ? "text-red-500" : "text-amber-500"}`}
                      >
                        {correct}/{total}
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Question-by-question review */}
          <div>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Question Review
            </h4>
            <div className="space-y-2">
              {attempt.questions.map((q, i) => {
                const correct = q.userAnswer === q.correctAnswer;
                const skipped = q.userAnswer === undefined;
                return (
                  <div
                    key={i}
                    className={`p-3.5 rounded-xl border text-sm ${correct ? "bg-emerald-500/10 border-emerald-500/30" : skipped ? "bg-card border-border" : "bg-red-500/10 border-red-500/30"}`}
                  >
                    <div className="flex items-start gap-2">
                      {correct ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      ) : skipped ? (
                        <span className="w-4 h-4 rounded-full border-2 border-muted-foreground mt-0.5 shrink-0 block" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-foreground text-xs leading-relaxed">
                            {q.text}
                          </p>
                          <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-lg font-bold shrink-0">
                            {q.topic}
                          </span>
                        </div>
                        {!correct && !skipped && (
                          <p className="text-xs text-red-500 mt-1 font-semibold">
                            Your answer:{" "}
                            <span className="font-bold">
                              {q.options[q.userAnswer]}
                            </span>
                          </p>
                        )}
                        {!correct && (
                          <p className="text-xs text-emerald-500 mt-0.5 font-semibold">
                            Correct:{" "}
                            <span className="font-bold">
                              {q.options[q.correctAnswer]}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyResults() {
  const [filter, setFilter] = useState("all");

  const avgScore = Math.round(
    mockHistory.reduce(
      (sum, a) => sum + Math.round((a.score / a.total) * 100),
      0,
    ) / mockHistory.length,
  );
  const best = Math.max(
    ...mockHistory.map((a) => Math.round((a.score / a.total) * 100)),
  );
  const totalAttempts = mockHistory.length;

  const filtered =
    filter === "all"
      ? mockHistory
      : mockHistory.filter((a) => {
          const pct = Math.round((a.score / a.total) * 100);
          if (filter === "passed") return pct >= 60;
          if (filter === "failed") return pct < 60;
          return true;
        });

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">My Results</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Review all your past mock test attempts and track your progress.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Attempts",
            value: totalAttempts,
            icon: Target,
            color: "bg-orange-500/15 text-orange-500 border border-orange-500/20",
          },
          {
            label: "Average Score",
            value: `${avgScore}%`,
            icon: BarChart2,
            color: "bg-blue-500/15 text-blue-500 border border-blue-500/20",
          },
          {
            label: "Best Score",
            value: `${best}%`,
            icon: Award,
            color: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20",
          },
          {
            label: "Trend",
            value: avgScore >= 70 ? "↑ Improving" : "↓ Needs work",
            icon: TrendingUp,
            color:
              avgScore >= 70
                ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                : "bg-amber-500/15 text-amber-500 border border-amber-500/20",
          },
        ].map((s, i) => (
          <div key={i} className="surface-card rounded-2xl p-4 border border-border hover:border-orange-500/30 transition-all">
            <div
              className={`w-8 h-8 rounded-xl ${s.color} flex items-center justify-center mb-2`}
            >
              <s.icon className="w-4 h-4" />
            </div>
            <div className="text-xl font-extrabold text-foreground tracking-tight">{s.value}</div>
            <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Score trend strip */}
      <div className="surface-card rounded-2xl p-5 border border-border">
        <h3 className="text-sm font-bold text-foreground mb-4">Score Trend</h3>
        <div className="flex items-end gap-3 h-20">
          {[...mockHistory].reverse().map((a, i) => {
            const pct = Math.round((a.score / a.total) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-muted-foreground">
                  {pct}%
                </span>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${(pct / 100) * 56}px`,
                    background:
                      pct >= 80 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444",
                    opacity: 0.85,
                  }}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                  Attempt {i + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          ["all", "All Attempts"],
          ["passed", "Passed (≥60%)"],
          ["failed", "Failed (<60%)"],
        ].map(([val, label]) => {
          const active = filter === val;
          return (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                active
                  ? "bg-orange-500/10 text-orange-500 dark:bg-orange-500/15 font-bold border border-orange-500/20"
                  : "bg-card border border-border text-muted-foreground hover:border-orange-500/40 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Attempts list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="surface-card rounded-2xl p-10 border border-border text-center text-muted-foreground text-sm">
            No attempts match this filter.
          </div>
        ) : (
          filtered.map((attempt) => (
            <AttemptCard key={attempt.id} attempt={attempt} />
          ))
        )}
      </div>
    </div>
  );
}
