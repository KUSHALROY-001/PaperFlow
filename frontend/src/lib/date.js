// Centralized date/time formatting helpers.
// Previously duplicated across ClusterWorkspace.jsx / ClustersLibrary.jsx
// (formatTimeAgo) and MockSession.jsx / SharedMock.jsx (formatTime -> formatDuration).

/**
 * Relative "time ago" label, e.g. "just now", "5 min ago", "3h ago".
 * Used for cluster/mock-test timestamps.
 */
export function formatTimeAgo(dateStr) {
  if (!dateStr) return "-";

  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Localized calendar date, e.g. "27 Jul 2026".
 * Used for mock-test generated/created/updated timestamps.
 */
export function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Wall-clock time, e.g. "3:45 PM".
 * Used for job start/completion timestamps.
 * (Was named `formatTime` in ActiveJobs.jsx — renamed to avoid colliding
 * with the countdown-timer formatter below, which had the same name but
 * a completely different signature and purpose.)
 */
export function formatClockTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

/**
 * Countdown duration in mm:ss, e.g. 125 -> "02:05".
 * Used for exam-timer displays.
 * (Was named `formatTime` in MockSession.jsx and SharedMock.jsx — renamed
 * for the same reason as formatClockTime above.)
 */
export function formatDuration(secs) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
