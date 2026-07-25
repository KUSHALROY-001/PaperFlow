import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "@/lib/AuthContext";

function MockCraftLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center text-[#ea580c] shrink-0">
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <span className="text-xl font-extrabold text-foreground tracking-tight">MockCraft</span>
    </div>
  );
}

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
    <div className="min-h-screen bg-background px-4 sm:px-6 py-6 sm:py-8 font-sans">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/">
          <MockCraftLogo />
        </Link>
        <ThemeToggle />
      </div>

      <div className="mx-auto mt-10 sm:mt-16 grid max-w-6xl gap-8 sm:gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs sm:text-sm font-bold text-orange-500 w-fit">
            <ShieldCheck className="h-4 w-4" />
            Secure access to your exam workspace
          </div>
          <h1 className="max-w-xl text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-foreground tracking-tight">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="surface-card rounded-[28px] p-6 sm:p-8 md:p-10 border border-border shadow-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">{ctaLabel}</h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Use your PaperFlow account to access clusters and mock tests.
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
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/30"
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
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/30"
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
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/30"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-all bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-60 shadow-sm"
            >
              {isSubmitting ? "Please wait..." : ctaLabel} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 text-sm">
            <Link to={altHref} className="font-semibold text-orange-500 hover:text-orange-600">
              {altLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
