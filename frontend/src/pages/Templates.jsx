import { useState } from "react";
import {
  Search,
  Star,
  Download,
  Eye,
  Zap,
  BookOpen,
  FileText,
  Target,
  ChevronRight,
  CheckCircle,
} from "lucide-react";

const templates = [
  {
    id: 1,
    name: "GATE CS",
    description:
      "Full GATE Computer Science exam format with subject-wise sections, 65 questions, 3hr duration.",
    category: "Entrance Exam",
    questions: 65,
    duration: "3 hrs",
    difficulty: "Hard",
    uses: 1240,
    rating: 4.9,
    tags: ["CS", "Engineering", "GATE"],
    color: "violet",
    popular: true,
    sections: [
      "Engineering Mathematics",
      "Digital Logic",
      "Computer Organization",
      "Programming & DS",
      "Algorithms",
      "Theory of Computation",
      "OS",
      "DBMS",
      "Networks",
    ],
  },
  {
    id: 2,
    name: "JECA Entrance",
    description:
      "MCA entrance exam format for Jadavpur University. 100 MCQs with negative marking.",
    category: "Entrance Exam",
    questions: 100,
    duration: "2 hrs",
    difficulty: "Medium",
    uses: 890,
    rating: 4.8,
    tags: ["MCA", "Computer Science", "West Bengal"],
    color: "blue",
    popular: true,
    sections: ["Mathematics", "Analytical Ability", "Computer Awareness"],
  },
  {
    id: 3,
    name: "JEE Mains",
    description:
      "IIT JEE Mains style with Physics, Chemistry, Math. 90 questions, +4/-1 marking.",
    category: "Entrance Exam",
    questions: 90,
    duration: "3 hrs",
    difficulty: "Hard",
    uses: 3450,
    rating: 4.9,
    tags: ["IIT", "Engineering", "PCM"],
    color: "emerald",
    popular: true,
    sections: ["Physics", "Chemistry", "Mathematics"],
  },
  {
    id: 4,
    name: "UPSC Prelims",
    description: "General Studies Paper I format. 100 questions, 2 hours.",
    category: "Government Exam",
    questions: 100,
    duration: "2 hrs",
    difficulty: "Hard",
    uses: 2100,
    rating: 4.7,
    tags: ["UPSC", "GS", "Civil Services"],
    color: "amber",
    popular: false,
    sections: [
      "History",
      "Geography",
      "Polity",
      "Economics",
      "Science & Tech",
      "Environment",
    ],
  },
  {
    id: 5,
    name: "Bank PO (IBPS)",
    description:
      "IBPS PO Prelims format with 3 sections. 100 questions, 60 minutes.",
    category: "Banking Exam",
    questions: 100,
    duration: "1 hr",
    difficulty: "Medium",
    uses: 1780,
    rating: 4.6,
    tags: ["Banking", "IBPS", "Finance"],
    color: "rose",
    popular: false,
    sections: [
      "English Language",
      "Quantitative Aptitude",
      "Reasoning Ability",
    ],
  },
  {
    id: 6,
    name: "Class 10 Science",
    description: "CBSE Class 10 Science chapter-wise MCQ format. 40 questions.",
    category: "School Exam",
    questions: 40,
    duration: "1.5 hrs",
    difficulty: "Easy",
    uses: 560,
    rating: 4.5,
    tags: ["CBSE", "Class 10", "Science"],
    color: "teal",
    popular: false,
    sections: ["Physics", "Chemistry", "Biology"],
  },
  {
    id: 7,
    name: "Quick Quiz (20Q)",
    description:
      "Short 20-question quick quiz format. Ideal for practice sessions.",
    category: "Custom",
    questions: 20,
    duration: "20 min",
    difficulty: "Variable",
    uses: 4200,
    rating: 4.4,
    tags: ["Quick", "Practice", "General"],
    color: "purple",
    popular: true,
    sections: ["Mixed Topics"],
  },
  {
    id: 8,
    name: "Subject Notes Extractor",
    description:
      "Extracts key concepts and definitions from study notes into Q&A format.",
    category: "Study Notes",
    questions: 50,
    duration: "Variable",
    difficulty: "Variable",
    uses: 730,
    rating: 4.6,
    tags: ["Notes", "Concepts", "Q&A"],
    color: "indigo",
    popular: false,
    sections: ["Key Concepts", "Definitions", "Formulas"],
  },
];

const categories = [
  "All",
  "Entrance Exam",
  "Government Exam",
  "Banking Exam",
  "School Exam",
  "Custom",
  "Study Notes",
];
const colorMap = {
  violet: "bg-violet-100 text-violet-700",
  blue: "bg-blue-100 text-blue-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  teal: "bg-teal-100 text-teal-700",
  purple: "bg-purple-100 text-purple-700",
  indigo: "bg-indigo-100 text-indigo-700",
};
const iconColorMap = {
  violet: "from-violet-500 to-indigo-500",
  blue: "from-blue-500 to-cyan-500",
  emerald: "from-emerald-500 to-green-500",
  amber: "from-amber-500 to-orange-500",
  rose: "from-rose-500 to-pink-500",
  teal: "from-teal-500 to-cyan-500",
  purple: "from-purple-500 to-violet-500",
  indigo: "from-indigo-500 to-blue-500",
};

export default function Templates() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [preview, setPreview] = useState(null);
  const [applied, setApplied] = useState(null);

  const filtered = templates.filter(
    (t) =>
      (category === "All" || t.category === category) &&
      (t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))),
  );

  const handleApply = (t) => {
    setApplied(t.id);
    setTimeout(() => setApplied(null), 2000);
  };

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Extraction Templates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pre-built formats for popular exams — apply to any cluster
            instantly.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">
            {templates.length}
          </div>
          <div className="text-xs text-muted-foreground">
            Templates available
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${category === c ? "gradient-violet text-white shadow-md shadow-violet-200" : "bg-card border border-border text-muted-foreground hover:border-violet-400 hover:text-violet-600"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Popular section */}
      {category === "All" && !search && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-sm font-bold text-foreground">
              Most Popular
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {templates
              .filter((t) => t.popular)
              .map((t) => (
                <div
                  key={t.id}
                  className="card-lavender rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setPreview(t)}
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconColorMap[t.color]} flex items-center justify-center mb-3 shadow-md`}
                  >
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-bold text-sm text-foreground">
                    {t.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.questions} questions
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-semibold text-foreground">
                      {t.rating}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({t.uses.toLocaleString()})
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* All templates grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="card-lavender rounded-2xl p-5 hover:shadow-md transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${iconColorMap[t.color]} flex items-center justify-center shadow-md shrink-0`}
              >
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-foreground">{t.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-lg font-medium ${colorMap[t.color]}`}
                    >
                      {t.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold text-foreground">
                      {t.rating}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {t.description}
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" /> {t.questions} Qs
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {t.duration}
                  </span>
                  <span
                    className={`font-semibold ${t.difficulty === "Easy" ? "text-emerald-600" : t.difficulty === "Medium" ? "text-amber-600" : "text-red-600"}`}
                  >
                    {t.difficulty}
                  </span>
                </div>
                <div className="flex flex-col min-[420px]:flex-row gap-2 mt-4">
                  <button
                    onClick={() => setPreview(t)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-50 border border-border text-violet-700 rounded-xl hover:bg-violet-100 transition-all"
                  >
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                  <button
                    onClick={() => handleApply(t)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${applied === t.id ? "bg-emerald-100 text-emerald-700" : "gradient-violet text-white shadow-sm shadow-violet-200 hover:opacity-90"}`}
                  >
                    {applied === t.id ? (
                      <>
                        <CheckCircle className="w-3 h-3" /> Applied!
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" /> Apply Template
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="w-full max-w-md card-lavender rounded-3xl shadow-2xl shadow-violet-200 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${iconColorMap[preview.color]} flex items-center justify-center mb-4 shadow-md`}
            >
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {preview.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {preview.description}
            </p>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Questions", value: preview.questions },
                { label: "Duration", value: preview.duration },
                { label: "Difficulty", value: preview.difficulty },
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
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Sections
              </div>
              <div className="space-y-1.5">
                {preview.sections.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <ChevronRight className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 py-2.5 border border-border text-muted-foreground font-semibold rounded-xl hover:bg-violet-50 text-sm transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleApply(preview);
                  setPreview(null);
                }}
                className="flex-1 py-2.5 gradient-violet text-white font-semibold rounded-xl shadow-md shadow-violet-200 hover:opacity-90 text-sm transition-all"
              >
                Apply Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
