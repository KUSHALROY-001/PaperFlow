import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { PENDING_INVITE_TOKEN_KEY } from "./AcceptInvite";
import { PENDING_CLAIM_KEY } from "@/hooks/useExamSession";

function PaperFlowLogo() {
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
        PaperFlow
      </span>
    </div>
  );
}

export default function AuthPage({ mode, title, description }) {
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ctaLabel = mode === "login" ? "Sign In" : "Create Account";
  const altLabel =
    mode === "login"
      ? "Need an account? Sign Up"
      : "Already have an account? Login";
  const altHref = mode === "login" ? "/signup" : "/login";

  // Shared by the password form (handleSubmit) and the Google button
  // (handleGoogleCredential) - identical redirect logic either way once
  // someone is actually authenticated, since neither the pending-invite
  // nor pending-claim checks below care HOW they signed in. Wrapped in
  // useCallback with no dependency on `form` (Google auth never touches
  // it) so GoogleSignInButton's effect - which intentionally only reruns
  // when `mode` changes, not on every render - always calls a function
  // that's actually current instead of a stale closure from first mount.
  const redirectAfterAuth = useCallback(async () => {
    // If AcceptInvite.jsx sent them here to log in/sign up first (see its
    // stash-and-redirect logic), send them back to finish accepting
    // instead of dropping them on the dashboard and losing the invite.
    const pendingInviteToken = sessionStorage.getItem(PENDING_INVITE_TOKEN_KEY);
    if (pendingInviteToken) {
      navigate(`/accept-invite?token=${pendingInviteToken}`, {
        replace: true,
      });
      return;
    }

    // Same idea for a guest who just took a shared mock test and chose
    // "log in to save this result" from the results screen (see
    // useExamSession's PENDING_CLAIM_KEY) - claim it now that they're
    // authenticated, then send them straight to My Results.
    const pendingClaimRaw = sessionStorage.getItem(PENDING_CLAIM_KEY);
    if (pendingClaimRaw) {
      sessionStorage.removeItem(PENDING_CLAIM_KEY);
      try {
        const { attemptId, shareToken } = JSON.parse(pendingClaimRaw);
        await api.claimSharedAttempt(shareToken, attemptId);
      } catch {
        // Link may have expired between submitting and logging in - not
        // worth blocking the login itself over, just skip the redirect.
      }
      navigate("/my-results", { replace: true });
      return;
    }

    navigate("/dashboard", { replace: true });
  }, [navigate]);

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
      await redirectAfterAuth();
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleCredential = useCallback(
    async (credential) => {
      setError("");
      try {
        await loginWithGoogle(credential);
        await redirectAfterAuth();
      } catch (err) {
        setError(err.message || "Google Sign-In failed");
      }
    },
    [loginWithGoogle, redirectAfterAuth],
  );

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-6 sm:py-8 font-sans">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/">
          <PaperFlowLogo />
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

        <div className="surface-card rounded-[28px] px-3 py-4 sm:p-8 md:p-10 border border-border shadow-md">
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
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Kushal"
                  className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/30"
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
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="you@example.com"
                className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="At least 8 characters"
                  className="w-full rounded-md border border-border bg-card pl-4 pr-12 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1.5 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/30 flex items-center justify-center"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <Eye className="h-5 w-5" />
                  ) : (
                    <EyeOff className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center border border-border justify-center gap-2 rounded-3xl px-6 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-green-500/80 dark:hover:bg-emerald-500 dark:border-white/25 disabled:opacity-60 shadow-sm"
            >
              {isSubmitting ? "Please wait..." : ctaLabel}{" "}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <GoogleSignInButton
            mode={mode}
            onCredential={handleGoogleCredential}
          />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 text-sm">
            <Link
              to={altHref}
              className="font-semibold text-orange-500 hover:text-orange-600"
            >
              {altLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
