import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "@/lib/AuthContext";

export default function AuthPage({ mode, title, description }) {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ctaLabel = mode === "login" ? "Sign In" : "Create Account";
  const altLabel =
    mode === "login" ? "Need an account? Sign Up" : "Already have an account? Login";
  const altHref = mode === "login" ? "/signup" : "/login";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login({
          email: form.email,
          password: form.password,
        });
      } else {
        await signup({
          name: form.name,
          email: form.email,
          password: form.password,
        });
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Use your PaperFlow backend account to access clusters and mock tests.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Name
                </label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Kushal"
                  className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-violet-300 focus:ring-2 focus:ring-violet-200 dark:bg-white/5"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Email
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-violet-300 focus:ring-2 focus:ring-violet-200 dark:bg-white/5"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Password
              </label>
              <input
                required
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="At least 8 characters"
                className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-violet-300 focus:ring-2 focus:ring-violet-200 dark:bg-white/5"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 gradient-violet"
            >
              {isSubmitting ? "Please wait..." : ctaLabel} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 text-sm">
            <Link to={altHref} className="font-medium text-violet-700 hover:text-violet-600">
              {altLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
