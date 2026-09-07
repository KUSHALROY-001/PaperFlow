import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { PENDING_INVITE_TOKEN_KEY } from "@/pages/AcceptInvite";
import { PENDING_CLAIM_KEY } from "@/hooks/useExamSession";

// Shared by AuthPage.jsx (login, Google sign-in/up) and
// VerifyEmailPage.jsx (the moment a signup/login actually finishes
// authenticating, now that email verification can sit in between) -
// identical "where does this person land next" logic regardless of
// which of those actually established the session.
export function useRedirectAfterAuth() {
  const navigate = useNavigate();

  return useCallback(async () => {
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
}
