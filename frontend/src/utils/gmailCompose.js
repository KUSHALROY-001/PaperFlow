// Opens a Gmail compose window for a specific address/subject/body - always
// Gmail specifically, never the device's default mail client (deliberate,
// see ContactUs.jsx - a mailto: link would hand off to whatever's set as
// default, which may not be Gmail).
//
// On desktop this is just the Gmail web compose URL in a new tab, as it's
// always been. On mobile, the web compose URL still WORKS, but it opens
// inside the browser instead of the Gmail app - there's no https:// URL
// Gmail's own app claims as a universal/app link for the compose view, so
// the OS has no way to know to hand it off. Getting the native app instead
// means asking for it directly: iOS Gmail registers the `googlegmail://co`
// custom scheme (Google's own documented deep-link format), and Android's
// Gmail app can be targeted by name via an intent URI's `package=` clause
// on top of the standard `mailto:` scheme - both bypass the browser
// entirely when the app is installed.
//
// Neither platform gives the page a reliable "app not installed" event, so
// the fallback to the web URL is a timeout: attempt the app link via a
// same-tab navigation, then check shortly after whether the tab is still
// the foreground page. If the app took over, the browser backgrounds
// (document.hidden becomes true) before the timeout fires. If nothing was
// installed to handle the scheme, the attempted navigation is a no-op and
// the tab is still sitting there when the timeout checks - that's the
// signal to fall back to the web compose URL instead.
const APP_HANDOFF_TIMEOUT_MS = 1500;

export function buildGmailUrls({ to, subject, body }) {
  // googlegmail:// and the mailto-based Android intent both use the
  // standard mailto query keys (subject=, body=) - only Gmail's own web
  // compose endpoint uses its nonstandard su= for subject.
  const appParams = `to=${encodeURIComponent(to)}&subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
  const webParams = `to=${encodeURIComponent(to)}&su=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;

  return {
    webUrl: `https://mail.google.com/mail/?view=cm&fs=1&${webParams}`,
    iosAppUrl: `googlegmail://co?${appParams}`,
    // package=com.google.android.gm pins this to the Gmail app specifically
    // rather than letting Android show its usual "which mailto app?"
    // chooser, which is what happens with a bare mailto: link when more
    // than one mail app is installed.
    androidIntentUrl: `intent://send/?${appParams}#Intent;scheme=mailto;package=com.google.android.gm;end`,
  };
}

function detectMobilePlatform() {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

// Fires the app-link navigation, then falls back to the web compose URL in
// a new tab if the tab is still in the foreground once the timeout elapses
// (see the module comment above for why that's the best signal available).
function attemptAppHandoff(appUrl, webUrl) {
  window.location.href = appUrl;
  setTimeout(() => {
    if (!document.hidden) {
      window.open(webUrl, "_blank");
    }
  }, APP_HANDOFF_TIMEOUT_MS);
}

// Always returns the web URL (even on mobile) so callers - see ContactUs.jsx
// - have something to store for a "re-open" retry without needing to know
// which branch actually fired.
export function openGmailCompose({ to, subject, body }) {
  const { webUrl, iosAppUrl, androidIntentUrl } = buildGmailUrls({
    to,
    subject,
    body,
  });
  const platform = detectMobilePlatform();

  if (platform === "ios") {
    attemptAppHandoff(iosAppUrl, webUrl);
  } else if (platform === "android") {
    attemptAppHandoff(androidIntentUrl, webUrl);
  } else {
    // Desktop: unchanged from before this feature existed.
    window.open(webUrl, "_blank");
  }

  return webUrl;
}
