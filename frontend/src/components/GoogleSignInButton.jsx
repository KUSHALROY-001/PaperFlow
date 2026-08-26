import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

// Cached across every mount of this component (there are two on
// AuthPage.jsx in practice - one per mode is possible if it's ever
// rendered twice - but really this guards against StrictMode's
// intentional double-invoke in dev too) - without this, each mount would
// inject its own <script> tag and re-run Google's global initialize(),
// which is wasteful and, worse, means whichever mount's `callback`
// closure initialize() captured LAST silently wins for every button on
// the page, not the one actually clicked.
let gisScriptPromise = null;

function loadGoogleIdentityScript() {
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Could not load Google Sign-In"));
    document.head.appendChild(script);
  });

  return gisScriptPromise;
}

// Renders Google's own native button (not a custom-styled one) - GIS's
// terms of service require the button's appearance to come from their
// renderButton call, not a lookalike built from scratch, so this
// deliberately doesn't try to reskin it to match PaperFlow's own button
// styling beyond a wrapping container.
export default function GoogleSignInButton({ mode, onCredential }) {
  const containerRef = useRef(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      // Not a user-facing error - this means the app itself hasn't been
      // configured with a real Google OAuth Client ID yet (see
      // backend/src/lib/google-oauth.js's matching dev warning for
      // GOOGLE_CLIENT_ID). Failing loudly to the person trying to sign
      // up would be wrong; just don't render the button.
      if (import.meta.env.DEV) {
        console.warn(
          "[GoogleSignInButton] VITE_GOOGLE_CLIENT_ID is not set - the Google Sign-In button will not render.",
        );
      }
      return;
    }

    let cancelled = false;

    loadGoogleIdentityScript()
      .then((google) => {
        if (cancelled || !containerRef.current) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        });
        const buttonWidth = Math.min(
          336,
          Math.max(240, (containerRef.current?.offsetWidth || window.innerWidth - 48)),
        );
        google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: buttonWidth,
          text: mode === "signup" ? "signup_with" : "signin_with",
        });
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message);
      });

    return () => {
      cancelled = true;
    };
    // onCredential intentionally excluded - re-running initialize() on
    // every render (which a fresh inline arrow function from the parent
    // would otherwise trigger) would re-inject the button and can leave
    // Google's own click handling in an inconsistent state. AuthPage.jsx
    // passes a stable handler for this reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (!GOOGLE_CLIENT_ID) return null;

  if (loadError) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        Google Sign-In isn't available right now.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex justify-center w-full max-w-full overflow-hidden"
    />
  );
}
