// Pure, React-free state helpers for the guide. Kept separate from
// GuideProvider so they can be exercised directly (e.g. from a
// `*.selftest.mjs` script, following this repo's existing convention -
// see docs/AI_INSTRUCTIONS.md) without mounting any React tree.

export const GUIDE_VERSION = 1;

export const CHAPTER_IDS = [
  "welcome",
  "cluster",
  "add-mock-test",
  "wizard",
  "processing",
  "review",
];

export const STATUSES = {
  IN_PROGRESS: "in_progress",
  PARKED: "parked",
  COMPLETED: "completed",
  DISMISSED: "dismissed",
};

export function emptyOnboarding() {
  return { v: GUIDE_VERSION, autoStartSeen: false, chapters: {}, entities: {} };
}

function storageKey(userId) {
  return `paperflow_guide_v1:${userId}`;
}

export function loadLocal(userId) {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    // Corrupt or inaccessible localStorage shouldn't break the guide -
    // just fall back to whatever the server has.
    return null;
  }
}

export function saveLocal(userId, onboarding) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(onboarding));
  } catch {
    // Best-effort only (private browsing, quota, etc).
  }
}

// A chapter is "further along" than another if its status ranks higher,
// or - for two chapters both in_progress/parked - if it simply has a
// step recorded and the other doesn't. This is intentionally coarse:
// the only two writers of this state are (a) this browser tab and
// (b) a PATCH this same user made from another device, so ties are
// rare and don't need to be adjudicated precisely.
const STATUS_RANK = {
  [STATUSES.IN_PROGRESS]: 1,
  [STATUSES.PARKED]: 1,
  [STATUSES.COMPLETED]: 2,
  [STATUSES.DISMISSED]: 2,
};

function furtherAlong(a, b) {
  if (!a) return b;
  if (!b) return a;
  const rankA = STATUS_RANK[a.status] || 0;
  const rankB = STATUS_RANK[b.status] || 0;
  if (rankA !== rankB) return rankA > rankB ? a : b;
  return a; // tie: prefer the server copy (caller passes server as `a`)
}

// Merges the server's onboarding record with a local copy, preferring
// whichever side is further along per chapter. The server is the
// tie-breaker (see furtherAlong), matching the "server wins ties" rule
// from the implementation plan.
export function mergeOnboarding(server, local) {
  const base = server || emptyOnboarding();
  const other = local || emptyOnboarding();

  const chapters = {};
  for (const chapterId of CHAPTER_IDS) {
    const merged = furtherAlong(base.chapters?.[chapterId], other.chapters?.[chapterId]);
    if (merged) chapters[chapterId] = merged;
  }

  return {
    v: GUIDE_VERSION,
    autoStartSeen: Boolean(base.autoStartSeen || other.autoStartSeen),
    chapters,
    entities: { ...other.entities, ...base.entities },
  };
}

export function setChapterStatus(onboarding, chapterId, status, step) {
  const next = {
    ...onboarding,
    chapters: {
      ...onboarding.chapters,
      [chapterId]: step ? { status, step } : { status },
    },
  };
  return next;
}

export function setEntity(onboarding, key, value) {
  if (!value) return onboarding;
  return { ...onboarding, entities: { ...onboarding.entities, [key]: value } };
}
