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
import { useAuth } from "@/lib/AuthContext";
import HeroAnimation from "@/components/HeroAnimation";
import HowItWorksSection from "@/components/howItWorks/HowItWorksSection";

function MockCraftLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center text-[#ea580c] shrink-0">
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className="text-xl font-extrabold text-foreground tracking-tight">
        MockCraft
      </span>
    </div>
  );
}

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

export default function Landing() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen font-sans bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <MockCraftLogo />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-orange-500 transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-orange-500 transition-colors"
            >
              How it Works
            </a>
            <a
              href="#use-cases"
              className="text-sm font-medium text-muted-foreground hover:text-orange-500 transition-colors"
            >
              Use Cases
            </a>
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className="text-sm font-semibold px-3 py-2 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 dark:text-orange-400 transition-colors"
              >
                Dashboard
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={logout}
                className="text-sm font-semibold px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-xl shadow-sm transition-all"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="text-sm font-semibold text-foreground hover:text-orange-500 transition-colors px-3 py-2"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-16 sm:pb-20 lg:pb-24 px-4 sm:px-6 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* ── LEFT: text content ── */}
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 mb-7">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span className="text-xs sm:text-sm font-bold text-orange-500">
                  AI-Powered Mock Test Generation
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold text-foreground tracking-tight leading-[1.1] mb-6">
                Turn messy PDFs into{" "}
                <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
                  structured mock tests
                </span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground mb-10 leading-relaxed max-w-xl">
                Upload scanned question papers or study material. We clean,
                correct, extract, and generate usable mock JSON — all in two
                automated phases.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-2xl shadow-sm transition-all text-base"
                >
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 surface-card border border-border text-foreground font-semibold rounded-2xl hover:bg-muted transition-all text-base"
                >
                  See How It Works
                </a>
              </div>

              {/* trust stats */}
              <div className="mt-10 flex items-center gap-6 flex-wrap">
                {[
                  { value: "10k+", label: "Questions Extracted" },
                  { value: "2", label: "AI Phases" },
                  { value: "99%", label: "Clean Output" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-xl font-extrabold text-foreground">
                      {s.value}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: animated demo ── */}
            <div className="relative flex items-center justify-center lg:justify-end">
              {/* glow orb behind card */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 60% at 60% 50%, rgba(234,88,12,0.12), transparent 70%)",
                }}
              />
              <div className="w-full max-w-[480px] relative z-10">
                <HeroAnimation />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 sm:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-xs sm:text-sm font-bold text-red-500">
                  The Problem
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-6">
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
                    <div className="w-5 h-5 bg-red-500/10 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {p}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-xs sm:text-sm font-bold text-emerald-500">
                  The Solution
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-6">
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
                    <div className="w-5 h-5 bg-emerald-500/10 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {s}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works – animated section */}
      <HowItWorksSection />

      {/* Features */}
      <section
        id="features"
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 bg-card border-y border-border"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-4">
              Everything you need
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Built for the full pipeline from scan to structured output
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="surface-card rounded-2xl p-6 border border-border hover:border-orange-500/30 transition-all hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 bg-orange-500/15 text-orange-500 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#ea580c] group-hover:text-white transition-colors">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section
        id="use-cases"
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 bg-background"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-4">
              Who uses MockCraft
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              For students and educators alike
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((u, i) => (
              <div
                key={i}
                className="surface-card rounded-2xl p-6 sm:p-8 border border-border flex gap-5 hover:border-orange-500/30 transition-all"
              >
                <div className="w-14 h-14 bg-orange-500/15 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
                  <u.icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {u.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {u.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      {!isAuthenticated && (
        <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 bg-card border-t border-border">
          <div className="max-w-2xl mx-auto text-center">
            <div className="surface-card rounded-3xl p-6 sm:p-12 border border-orange-500/20 bg-gradient-to-r from-orange-500/5 via-orange-500/10 to-transparent">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/15 text-orange-500 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-4">
                Ready to start?
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-8">
                Create your first cluster and upload a PDF in under 2 minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-2xl shadow-sm transition-all"
                >
                  Login <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/">
            <MockCraftLogo />
          </Link>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Turn scanned PDFs into structured mock tests.
          </p>
        </div>
      </footer>
    </div>
  );
}
