import { Link } from "react-router-dom";
import {
  Upload,
  Zap,
  CheckCircle,
  Download,
  BookOpen,
  FileText,
  Brain,
  Star,
  ArrowRight,
  Sparkles,
  Users,
  GraduationCap,
} from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Smart PDF Upload",
    desc: "Drag and drop any scanned PDF — low quality scans are totally fine. We handle it.",
  },
  {
    icon: Zap,
    title: "OCR Correction Pipeline",
    desc: "Our two-phase pipeline corrects OCR errors and cleans up garbled text automatically.",
  },
  {
    icon: Brain,
    title: "AI Question Extraction",
    desc: "Detects MCQs, structured questions, and options with topic tagging and confidence scoring.",
  },
  {
    icon: CheckCircle,
    title: "Review Before Export",
    desc: "Inspect every extracted question, fix issues, mark approvals — full control before export.",
  },
  {
    icon: Download,
    title: "Clean JSON Output",
    desc: "Download a structured mock JSON ready for integration into any test platform or app.",
  },
  {
    icon: BookOpen,
    title: "Cluster-Based Organization",
    desc: "Organize your documents by exam, subject, or batch. One cluster = one clean workspace.",
  },
];

const steps = [
  {
    num: "01",
    title: "Upload PDF",
    desc: "Drop your scanned question paper or notes into a cluster workspace.",
  },
  {
    num: "02",
    title: "OCR Correction",
    desc: "Phase 1 cleans and corrects raw OCR output into readable, structured text.",
  },
  {
    num: "03",
    title: "Extract Questions",
    desc: "Phase 2 detects MCQs, options, and answers — building a structured schema.",
  },
  {
    num: "04",
    title: "Review & Export",
    desc: "Review the output, approve questions, and download clean mock JSON.",
  },
];

const useCases = [
  {
    icon: GraduationCap,
    title: "Student Exam Prep",
    desc: "Digitize PYQs and study notes into personal mock test banks for JECA, GATE, and more.",
  },
  {
    icon: Users,
    title: "Coaching Centers",
    desc: "Process batches of question papers and generate structured mock tests for students.",
  },
  {
    icon: FileText,
    title: "PYQ Digitization",
    desc: "Convert years of past papers into searchable, structured question databases.",
  },
  {
    icon: Star,
    title: "Mock Test Creation",
    desc: "Build full mock exams from multiple sources in minutes, not hours.",
  },
];

const sourceLineWidths = [82, 96, 74, 88, 69];

export default function Landing() {
  return (
    <div className="min-h-screen font-inter bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-violet rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">MockCraft</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              How it Works
            </a>
            <a
              href="#use-cases"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Use Cases
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="text-sm font-semibold px-4 py-2 gradient-violet text-white rounded-xl shadow-lg shadow-violet-200 hover:opacity-90 transition-all"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 sm:pb-20 lg:pb-24 px-4 sm:px-6 gradient-hero">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-card/70 backdrop-blur-sm border border-border rounded-full px-4 py-2 mb-8 shadow-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              AI-Powered Mock Test Generation
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-foreground leading-tight mb-6">
            Turn messy PDFs into
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
              structured mock tests
            </span>
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload scanned question papers or study material. We clean, correct,
            extract, and generate usable mock JSON — all in two automated
            phases.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 gradient-violet text-white font-semibold rounded-2xl shadow-xl shadow-violet-200 hover:opacity-90 transition-all text-lg"
            >
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-8 py-4 bg-card border border-border text-primary font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all text-lg"
            >
              See How It Works
            </a>
          </div>
        </div>

        {/* Hero mockup */}
        <div className="max-w-5xl mx-auto mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-lavender rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-violet-100 rounded-lg flex items-center justify-center">
                <FileText className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Source PDF
              </span>
            </div>
            {sourceLineWidths.map((width, i) => (
              <div
                key={i}
                className="h-2 bg-violet-100 rounded-full"
                style={{
                  width: `${width}%`,
                  opacity: 0.5 + i * 0.1,
                }}
              />
            ))}
            <div className="h-2 w-3/4 bg-red-100 rounded-full" />
            <div className="h-2 w-full bg-violet-100 rounded-full opacity-40" />
            <div className="h-2 w-2/3 bg-orange-100 rounded-full" />
          </div>

          <div className="card-lavender rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Zap className="w-3 h-3 text-indigo-600" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Processing
              </span>
            </div>
            <div className="space-y-3">
              {[
                "Phase 1: OCR",
                "Correction",
                "Phase 2: Extract",
                "Validation",
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${i < 2 ? "bg-emerald-100" : i === 2 ? "bg-violet-100 pulse-violet" : "bg-gray-100"}`}
                  >
                    {i < 2 ? (
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                    ) : i === 2 ? (
                      <Zap className="w-3 h-3 text-primary" />
                    ) : (
                      <div className="w-2 h-2 bg-gray-300 rounded-full" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-lavender rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Mock JSON
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 font-mono text-xs text-slate-600 space-y-1">
              <div>
                <span className="text-violet-500">"q"</span>:{" "}
                <span className="text-emerald-600">"Which..."</span>
              </div>
              <div>
                <span className="text-violet-500">"options"</span>: [
              </div>
              <div className="pl-3 text-indigo-500">"A", "B", "C", "D"</div>
              <div>]</div>
              <div>
                <span className="text-violet-500">"answer"</span>:{" "}
                <span className="text-emerald-600">"B"</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 bg-red-400 rounded-full" />
                <span className="text-sm font-medium text-red-600">
                  The Problem
                </span>
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-6">
                Scanned PDFs are a nightmare to work with
              </h2>
              <div className="space-y-4">
                {[
                  "Poor scan quality makes OCR unreliable",
                  "Manual typing from papers takes hours",
                  "No clean question bank format exists",
                  "Errors slip through without review tools",
                  "Organizing files across subjects is messy",
                ].map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                      <span className="w-2 h-2 bg-red-400 rounded-full" />
                    </div>
                    <p className="text-muted-foreground">{p}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span className="text-sm font-medium text-emerald-600">
                  The Solution
                </span>
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-6">
                MockCraft handles the hard parts automatically
              </h2>
              <div className="space-y-4">
                {[
                  "Upload any scan — quality doesn't matter",
                  "Phase 1 corrects OCR errors automatically",
                  "Phase 2 extracts and structures questions",
                  "Review interface to fix and approve",
                  "Cluster-based workspace keeps it organized",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                    </div>
                    <p className="text-muted-foreground">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 gradient-hero">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Four simple steps from raw PDF to ready mock test
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-violet-200 to-transparent z-0" />
                )}
                <div className="card-lavender rounded-2xl p-6 relative z-10 hover:shadow-lg transition-shadow">
                  <div className="text-4xl font-extrabold bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent mb-4">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything you need
            </h2>
            <p className="text-lg text-muted-foreground">
              Built for the full pipeline from scan to structured output
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="card-lavender rounded-2xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-violet-600 transition-colors">
                  <f.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 gradient-hero">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Who uses MockCraft
            </h2>
            <p className="text-lg text-muted-foreground">
              For students and educators alike
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((u, i) => (
              <div
                key={i}
                className="card-lavender rounded-2xl p-8 flex gap-5 hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center shrink-0">
                  <u.icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {u.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {u.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 bg-card">
        <div className="max-w-2xl mx-auto text-center">
          <div className="gradient-card rounded-3xl p-6 sm:p-12 border border-border">
            <Sparkles className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Ready to start?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Create your first cluster and upload a PDF in under 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 gradient-violet text-white font-semibold rounded-2xl shadow-xl shadow-violet-200 hover:opacity-90 transition-all"
              >
                Create Free Account <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-card border border-border text-primary font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 gradient-violet rounded-md flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-foreground">MockCraft</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Turn scanned PDFs into structured mock tests.
          </p>
        </div>
      </footer>
    </div>
  );
}
