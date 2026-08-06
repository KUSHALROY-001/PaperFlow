import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export const PENDING_INVITE_TOKEN_KEY = "paperflow_pending_invite_token";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, switchWorkspace } = useAuth();
  const [status, setStatus] = useState("working"); // working | error
  const [error, setError] = useState("");
  const attempted = useRef(false);

  // A token in the URL always wins over a stashed one - this page can be
  // reached either fresh (?token=... from the invite link) or after a
  // login/signup redirect (see AuthPage.jsx), which reads the stash itself.
  const token =
    searchParams.get("token") ||
    sessionStorage.getItem(PENDING_INVITE_TOKEN_KEY);

  useEffect(() => {
    if (isLoadingAuth || attempted.current) return;

    if (!token) {
      setStatus("error");
      setError("This invite link is missing its token.");
      return;
    }

    if (!isAuthenticated) {
      // Stash it and send them to log in or sign up with the invited
      // email; AuthPage checks this same key after a successful
      // login/signup and redirects back here instead of to /dashboard.
      sessionStorage.setItem(PENDING_INVITE_TOKEN_KEY, token);
      navigate("/login", { replace: true });
      return;
    }

    attempted.current = true;

    api
      .acceptInvitation(token)
      .then((result) => {
        sessionStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
        switchWorkspace(result.workspaceId);
      })
      .catch((acceptError) => {
        sessionStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
        setStatus("error");
        setError(acceptError.message || "Could not accept this invitation");
      });
  }, [isLoadingAuth, isAuthenticated, token, navigate, switchWorkspace]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm surface-card border border-border rounded-3xl shadow-2xl p-8 text-center">
        {status === "working" ? (
          <>
            <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-foreground">
              Joining workspace...
            </p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Couldn't accept this invitation
            </p>
            <p className="text-xs text-muted-foreground mb-5">{error}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
