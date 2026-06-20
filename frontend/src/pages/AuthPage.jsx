import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

export default function AuthPage({ mode, title, description }) {
  const ctaLabel = mode === "login" ? "Sign In" : "Create Account";
  const altLabel =
    mode === "login" ? "Need an account? Sign Up" : "Already have an account? Login";
  const altHref = mode === "login" ? "/signup" : "/login";

  return (
    <div className="min-h-screen gradient-hero px-4 sm:px-6 py-6 sm:py-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-violet">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">MockCraft</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="mx-auto mt-10 sm:mt-16 grid max-w-6xl gap-8 sm:gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/75 px-4 py-2 text-sm font-medium text-violet-700 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4" />
            Secure access to your exam workspace
          </div>
          <h1 className="max-w-xl text-4xl sm:text-5xl font-extrabold leading-tight text-foreground">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="card-lavender rounded-[28px] p-5 sm:p-8 md:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">{ctaLabel}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This placeholder keeps navigation working while backend auth is still being built.
            </p>
          </div>

          <form className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-violet-300 focus:ring-2 focus:ring-violet-200 dark:bg-white/5"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-violet-300 focus:ring-2 focus:ring-violet-200 dark:bg-white/5"
              />
            </div>

            {mode === "signup" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Workspace Name
                </label>
                <input
                  type="text"
                  placeholder="JECA prep batch"
                  className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-violet-300 focus:ring-2 focus:ring-violet-200 dark:bg-white/5"
                />
              </div>
            )}

            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 gradient-violet"
            >
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 text-sm">
            <Link to={altHref} className="font-medium text-violet-700 hover:text-violet-600">
              {altLabel}
            </Link>
            <Link to="/dashboard" className="font-medium text-slate-500 hover:text-violet-600">
              Skip to demo app
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
