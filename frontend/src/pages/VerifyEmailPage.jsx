import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Mail,
  Pencil,
  RotateCw,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "@/lib/AuthContext";
import { useRedirectAfterAuth } from "@/hooks/useRedirectAfterAuth";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const EMPTY_DIGITS = Array(OTP_LENGTH).fill("");

function formatCooldown(seconds) {
  const clamped = Math.max(seconds, 0);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

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

export default function VerifyEmailPage() {
  const location = useLocation();
  const { verifyOtp, resendOtp } = useAuth();
  const redirectAfterAuth = useRedirectAfterAuth();

  // Only source of the email on this screen - reached exclusively via
  // AuthPage.jsx's navigate("/verify-email", { state: { email } }), for
  // either a fresh signup or a login blocked on email_verified. No email
  // in state means someone landed here directly (refresh, bookmark, back
  // button) - send them to start over rather than showing a broken form.
  const email = location.state?.email || "";

  const [digits, setDigits] = useState(EMPTY_DIGITS);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);
  const cooldownTimer = useRef(null);

  // Error/success banners below auto-clear after 10s instead of sitting
  // on screen forever - see useAutoDismiss.
  useAutoDismiss(error, setError);
  useAutoDismiss(resendMessage, setResendMessage);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    return () => clearInterval(cooldownTimer.current);
  }, []);

  const startCooldown = useCallback((seconds) => {
    setCooldown(seconds);
    clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          clearInterval(cooldownTimer.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }, []);

  const runVerify = useCallback(
    async (code) => {
      if (code.length !== OTP_LENGTH || isVerifying) return;
      setError("");
      setResendMessage("");
      setIsVerifying(true);

      try {
        await verifyOtp({ email, otp: code });
        await redirectAfterAuth();
      } catch (err) {
        setError(err.message || "Verification failed");
        setDigits(EMPTY_DIGITS);
        inputRefs.current[0]?.focus();
      } finally {
        setIsVerifying(false);
      }
    },
    [email, isVerifying, redirectAfterAuth, verifyOtp],
  );

  // Auto-submits the moment all six boxes are filled (typing the last
  // digit, or pasting a full code) - matches how OTP inputs behave
  // everywhere else, without requiring an extra tap on "Verify Email".
  useEffect(() => {
    const code = digits.join("");
    if (code.length === OTP_LENGTH) {
      runVerify(code);
    }
    // Only re-run when the digits themselves change - runVerify is
    // recreated on every render (it closes over isVerifying) and would
    // otherwise re-fire this effect mid-verification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const handleDigitChange = (index, rawValue) => {
    const value = rawValue.replace(/\D/g, "");
    if (!value) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }

    // Browsers/password managers sometimes drop more than one character
    // into a single box (e.g. autofill) - keep only the last one typed.
    const char = value.slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;

    setDigits(Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] || ""));
    const lastIndex = Math.min(pasted.length, OTP_LENGTH) - 1;
    inputRefs.current[Math.max(lastIndex, 0)]?.focus();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    runVerify(digits.join(""));
  };

  const handleResend = async () => {
    setError("");
    setResendMessage("");
    setIsResending(true);

    try {
      await resendOtp({ email });
      setResendMessage("A new code has been sent to your email.");
      setDigits(EMPTY_DIGITS);
      inputRefs.current[0]?.focus();
      startCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      // The backend also enforces the cooldown server-side and reports
      // how long is actually left (see auth.service.js#resendOtp) -
      // trust that over the client-side timer if they disagree, e.g.
      // after a page refresh reset the local countdown to 0.
      if (err.details?.retryAfterSeconds) {
        startCooldown(err.details.retryAfterSeconds);
      }
      setError(err.message || "Could not resend the code");
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-background px-4 sm:px-6 py-4 sm:py-8 font-sans flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          We couldn't find a pending verification. Please sign up or log in
          again.
        </p>
        <Link
          to="/login"
          className="font-semibold text-orange-500 hover:text-orange-600"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-4 sm:py-8 font-sans flex flex-col justify-between">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link to="/">
          <PaperFlowLogo />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>

      <div className="mx-auto my-auto w-full max-w-md">
        <div className="surface-card rounded-2xl sm:rounded-[28px] p-5 sm:p-8 md:p-10 border border-border shadow-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
            <Mail className="h-7 w-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Verify your email
          </h2>
          <p className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
            <span>We sent a 6-digit code to</span>
            <Link
              to="/login"
              title="Wrong email? Go back and sign in or sign up again."
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium text-foreground transition-colors hover:bg-muted/70"
            >
              {email}
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </Link>
          </p>

          <form className="mt-6" onSubmit={handleSubmit}>
            <div className="flex justify-center gap-2 sm:gap-3">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={digit}
                  onChange={(event) =>
                    handleDigitChange(index, event.target.value)
                  }
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={handlePaste}
                  className="h-12 w-10 rounded-md border border-border bg-card text-center text-lg font-semibold text-foreground outline-none transition-all focus:border-blue-500 sm:h-14 sm:w-12"
                />
              ))}
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-medium text-red-500">
                {error}
              </div>
            )}

            {resendMessage && !error && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-medium text-emerald-600">
                {resendMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || digits.join("").length !== OTP_LENGTH}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-500 px-4 sm:px-6 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify Email</span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">
              OR
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 sm:px-6 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold text-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCw className="h-4 w-4 shrink-0" />
            {cooldown > 0
              ? `Resend code in ${formatCooldown(cooldown)}`
              : isResending
                ? "Resending..."
                : "Resend code"}
          </button>

          <p className="mt-4 text-xs text-muted-foreground">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
}
