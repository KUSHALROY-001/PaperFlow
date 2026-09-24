import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { matchPath, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import GuideAdapter from "./GuideAdapter";
import { CHAPTERS, CHAPTERS_BY_ID } from "./chapters";
import { routeMatches, subscribeAdvance, waitForElement } from "./conditions";
import {
  emptyOnboarding,
  loadLocal,
  mergeOnboarding,
  saveLocal,
  setChapterStatus,
  setEntity,
  STATUSES,
} from "./guideState";
import { useIsDesktop } from "./useIsDesktop";

const GuideContext = createContext(null);

// Feature flag - lets the guide ship dark until it's ready, and gives an
// instant kill switch without a deploy rollback. See Vite env docs; unset
// (undefined) is treated as enabled so local dev doesn't need a .env
// entry to see the guide.
const GUIDE_ENABLED = import.meta.env.VITE_GUIDE_ENABLED !== "false";

const SAVE_DEBOUNCE_MS = 500;

function stepIndexForId(chapter, stepId) {
  const index = chapter.steps.findIndex((step) => step.id === stepId);
  return index >= 0 ? index : 0;
}

function resolveTarget(target) {
  return typeof target === "string" ? target : target;
}

// Default target-wait timeout for a step whose element is already on
// screen (or about to be, from something the person just did). Steps
// that instead involve a route change plus a fresh data fetch (e.g.
// landing on the Review tab after auto-navigating there) pass a longer
// `waitTimeout` on the step definition itself.
const DEFAULT_WAIT_TIMEOUT = 4000;

export function GuideProvider({ children }) {
  const { user, role, isViewer } = useAuth();
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [onboarding, setOnboardingState] = useState(null);
  const [position, setPosition] = useState(null); // { chapterId, stepIndex }
  const [resolvedStep, setResolvedStep] = useState(null); // { def, element }

  const saveTimerRef = useRef(null);
  const hydratedRef = useRef(false);
  const waitAbortRef = useRef(null);
  const advanceUnsubRef = useRef(null);

  const clusterMatch = matchPath("/cluster/:clusterId/*", location.pathname);
  const mockTestMatch = matchPath(
    "/cluster/:clusterId/mocktest/:mockTestId/*",
    location.pathname,
  );
  const ids = {
    clusterId:
      mockTestMatch?.params.clusterId || clusterMatch?.params.clusterId,
    mockTestId: mockTestMatch?.params.mockTestId,
  };

  // --- persistence ------------------------------------------------------

  const persist = useCallback(
    (next) => {
      setOnboardingState(next);
      if (user?.id) saveLocal(user.id, next);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        api.saveOnboarding(next).catch(() => {
          // Best-effort - localStorage already has it, and the next
          // successful save will carry the same state forward.
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [user],
  );

  const persistNow = useCallback(
    (next) => {
      setOnboardingState(next);
      if (user?.id) saveLocal(user.id, next);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      api.saveOnboarding(next).catch(() => {});
    },
    [user],
  );

  // --- hydrate from AuthContext once /me has returned onboarding -------
  //
  // AuthContext already fetched `onboarding` as part of api.me(); we
  // don't re-fetch here. We just merge it against whatever this browser
  // has locally (covers a save that raced a reload) and figure out
  // where, if anywhere, the person left off.
  const { onboarding: serverOnboarding } = useAuth();

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!user?.id || serverOnboarding === null) return;
    hydratedRef.current = true;

    const local = loadLocal(user.id);
    const merged = mergeOnboarding(serverOnboarding, local);
    setOnboardingState(merged);
    saveLocal(user.id, merged);

    const resumeChapter = CHAPTERS.find((chapter) => {
      const progress = merged.chapters[chapter.id];
      return (
        progress &&
        (progress.status === STATUSES.IN_PROGRESS ||
          progress.status === STATUSES.PARKED)
      );
    });

    if (resumeChapter) {
      const progress = merged.chapters[resumeChapter.id];
      setPosition({
        chapterId: resumeChapter.id,
        stepIndex: stepIndexForId(resumeChapter, progress.step),
      });
    } else if (!merged.autoStartSeen) {
      persistNow({ ...merged, autoStartSeen: true });
      setPosition({ chapterId: "welcome", stepIndex: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, serverOnboarding]);

  // --- context available to `when`/`isDone` and advance conditions -----

  const ctx = useMemo(
    () => ({
      role,
      isViewer,
      isDesktop,
      ids,
      queryClient,
      onboarding,
      stats: {
        totalClusters: queryClient.getQueryData(["dashboard-summary"])?.stats
          ?.total_clusters,
        totalMockTests: queryClient.getQueryData(["dashboard-summary"])?.stats
          ?.total_mock_tests,
      },
      hasProcessingJob:
        (queryClient.getQueryData([
          "processing-jobs",
          "mock-test",
          ids.mockTestId,
        ])?.jobs?.length ?? 1) > 0,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, isViewer, isDesktop, ids.clusterId, ids.mockTestId, onboarding],
  );

  // --- chapter/step navigation ------------------------------------------

  const findNextEligibleChapter = useCallback(
    (fromIndex) => {
      for (let i = fromIndex; i < CHAPTERS.length; i += 1) {
        const chapter = CHAPTERS[i];
        const alreadyDone =
          chapter.isDone?.(ctx) ||
          [STATUSES.COMPLETED, STATUSES.DISMISSED].includes(
            onboarding?.chapters?.[chapter.id]?.status,
          );
        const eligible = chapter.when ? chapter.when(ctx) : true;
        if (!alreadyDone && eligible) return chapter;
      }
      return null;
    },
    [ctx, onboarding],
  );

  // Jumps straight into the review chapter: switches the app itself to
  // the Review tab (a real click if we're already on that mock test's
  // page so the app's own tab state updates normally, or a navigation
  // with ?tab=review if we're not there at all) and starts the review
  // chapter's spotlight from its first step. Called the instant
  // extraction finishes - see the "processing" special-case in
  // finishChapter below, and the background watcher further down for
  // when extraction finishes while the person has already navigated
  // away.
  const goToReviewChapter = useCallback(
    (entities) => {
      const clusterId = entities?.clusterId || ids.clusterId;
      const mockTestId = entities?.mockTestId || ids.mockTestId;
      const onThisMockTest =
        Boolean(mockTestId) && ids.mockTestId === mockTestId;

      if (onThisMockTest) {
        document.querySelector('[data-tour="tab-review"]')?.click();
      } else if (clusterId && mockTestId) {
        navigate(`/cluster/${clusterId}/mocktest/${mockTestId}?tab=review`);
      }
      setPosition({ chapterId: "review", stepIndex: 0 });
    },
    [ids.clusterId, ids.mockTestId, navigate],
  );

  const finishChapter = useCallback(
    (chapterId, status) => {
      const base = onboarding || emptyOnboarding();
      const next = setChapterStatus(base, chapterId, status);

      if (chapterId === "processing" && status === STATUSES.COMPLETED) {
        // Don't fall through to the generic "next eligible chapter"
        // sequencing below - jump straight to the Review tab instead of
        // waiting for the person to click it themselves. See
        // goToReviewChapter.
        persistNow(next);
        goToReviewChapter(next.entities);
        return;
      }

      persist(next);
      const currentIndex = CHAPTERS.findIndex((c) => c.id === chapterId);
      const nextChapter = findNextEligibleChapter(currentIndex + 1);
      setPosition(
        nextChapter ? { chapterId: nextChapter.id, stepIndex: 0 } : null,
      );
    },
    [
      onboarding,
      persist,
      persistNow,
      findNextEligibleChapter,
      goToReviewChapter,
    ],
  );

  // --- the run loop: resolve current step, wait for target, subscribe --

  useEffect(() => {
    waitAbortRef.current?.abort();
    advanceUnsubRef.current?.();
    setResolvedStep(null);

    if (!position || !onboarding) return undefined;
    const chapter = CHAPTERS_BY_ID[position.chapterId];
    if (!chapter) return undefined;

    // Chapter-level route guard (e.g. processing/review only apply on a
    // mock test workspace page).
    if (chapter.route && !chapter.route.test(location.pathname)) {
      const next = setChapterStatus(
        onboarding,
        chapter.id,
        STATUSES.PARKED,
        chapter.steps[position.stepIndex]?.id,
      );
      persist(next);
      return undefined;
    }

    let stepIndex = position.stepIndex;
    while (
      stepIndex < chapter.steps.length &&
      chapter.steps[stepIndex].when &&
      !chapter.steps[stepIndex].when(ctx)
    ) {
      stepIndex += 1;
    }

    if (stepIndex >= chapter.steps.length) {
      finishChapter(chapter.id, STATUSES.COMPLETED);
      return undefined;
    }

    if (stepIndex !== position.stepIndex) {
      setPosition({ chapterId: chapter.id, stepIndex });
      return undefined;
    }

    const step = chapter.steps[stepIndex];

    // A step whose `advance` fires on a route change (rather than a
    // click/element/query inside the current page) needs to be checked
    // here rather than via subscribeAdvance: by the time the route has
    // already changed to match, whatever DOM target this step pointed
    // at (e.g. the wizard's Create button, now unmounted after the
    // modal closed and the app navigated away) may no longer exist, so
    // there's nothing left to wait for or spotlight.
    if (
      step.advance?.on === "route" &&
      step.advance.match.test(location.pathname)
    ) {
      setPosition({ chapterId: chapter.id, stepIndex: stepIndex + 1 });
      return undefined;
    }

    if (!routeMatches(step, location.pathname)) {
      const next = setChapterStatus(
        onboarding,
        chapter.id,
        STATUSES.PARKED,
        step.id,
      );
      persist(next);
      return undefined;
    }

    const controller = new AbortController();
    waitAbortRef.current = controller;

    waitForElement(resolveTarget(step.target), {
      signal: controller.signal,
      timeout: step.waitTimeout || DEFAULT_WAIT_TIMEOUT,
    }).then((element) => {
      if (controller.signal.aborted) return;
      if (!element) {
        // Target never showed up (e.g. the person picked Generate
        // instead of Upload, so `mock-upload` doesn't exist). Park
        // rather than get stuck, and remember entities we do have so
        // Resume can pick this back up if the target reappears.
        const next = setChapterStatus(
          onboarding,
          chapter.id,
          STATUSES.PARKED,
          step.id,
        );
        persist(next);
        return;
      }

      setResolvedStep({ def: step, element });

      const withEntities =
        ids.clusterId || ids.mockTestId
          ? setEntity(
              setEntity(onboarding, "clusterId", ids.clusterId),
              "mockTestId",
              ids.mockTestId,
            )
          : onboarding;
      const next = setChapterStatus(
        withEntities,
        chapter.id,
        STATUSES.IN_PROGRESS,
        step.id,
      );
      persist(next);

      advanceUnsubRef.current = subscribeAdvance(step, ctx, () => {
        setPosition((pos) =>
          pos && pos.chapterId === chapter.id
            ? { chapterId: chapter.id, stepIndex: pos.stepIndex + 1 }
            : pos,
        );
      });
    });

    return () => {
      controller.abort();
      advanceUnsubRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, location.pathname]);

  // --- background watch for a parked "processing" chapter --------------
  //
  // If the person left the mock test page while extraction was still
  // running, the run loop above stops (nothing to spotlight off-page).
  // This effect keeps a lightweight watch going anyway so the guide can
  // jump them straight into the Review chapter (see goToReviewChapter)
  // the instant extraction finishes, with no click required from them -
  // whether or not they're still watching.
  useEffect(() => {
    const processingProgress = onboarding?.chapters?.processing;
    const mockTestId = onboarding?.entities?.mockTestId;
    if (
      !processingProgress ||
      processingProgress.status !== STATUSES.PARKED ||
      processingProgress.step !== "wait" ||
      !mockTestId
    ) {
      return undefined;
    }

    const key = ["processing-jobs", "mock-test", mockTestId];
    let handled = false;
    const check = () => {
      if (handled) return;
      const data = queryClient.getQueryData(key);
      if (data?.jobs?.[0]?.status === "completed") {
        handled = true;
        const next = setChapterStatus(
          onboarding,
          "processing",
          STATUSES.COMPLETED,
        );
        persistNow(next);
        goToReviewChapter(next.entities);
      }
    };
    check();
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event?.query?.queryKey?.length === key.length &&
        event.query.queryKey.every((part, i) => part === key[i])
      ) {
        check();
      }
    });
    // Also poll directly, slowly, in case nothing else on screen is
    // fetching this query right now (the person may be on a totally
    // different page with no component mounted that would trigger it).
    const interval = setInterval(() => {
      queryClient
        .fetchQuery({
          queryKey: key,
          queryFn: () => api.listProcessingJobs({ mockTestId }),
        })
        .catch(() => {});
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [onboarding, queryClient, persistNow, goToReviewChapter]);

  // --- public actions ----------------------------------------------------

  const onNext = useCallback(() => {
    setPosition((pos) =>
      pos ? { chapterId: pos.chapterId, stepIndex: pos.stepIndex + 1 } : pos,
    );
  }, []);

  const onBack = useCallback(() => {
    setPosition((pos) =>
      pos
        ? {
            chapterId: pos.chapterId,
            stepIndex: Math.max(0, pos.stepIndex - 1),
          }
        : pos,
    );
  }, []);

  const onSkip = useCallback(() => {
    if (!position || !onboarding) return;
    const next = setChapterStatus(
      onboarding,
      position.chapterId,
      STATUSES.DISMISSED,
    );
    persistNow(next);
    setPosition(null);
  }, [position, onboarding, persistNow]);

  const value = useMemo(
    () => ({
      enabled: GUIDE_ENABLED,
      skipCurrent: onSkip,
      isRunning: Boolean(resolvedStep),
    }),
    [onSkip, resolvedStep],
  );

  if (!GUIDE_ENABLED) {
    const disabledValue = {
      enabled: false,
      skipCurrent: () => {},
      isRunning: false,
    };
    return (
      <GuideContext.Provider value={disabledValue}>
        {children}
      </GuideContext.Provider>
    );
  }

  const chapter = position ? CHAPTERS_BY_ID[position.chapterId] : null;
  const totalSteps = chapter?.steps.length || 0;
  const stepNumber = position ? position.stepIndex + 1 : 0;

  return (
    <GuideContext.Provider value={value}>
      {children}
      <GuideAdapter
        activeStep={resolvedStep}
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        onNext={onNext}
        onBack={onBack}
        onSkip={onSkip}
      />
    </GuideContext.Provider>
  );
}

export function useGuide() {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error("useGuide must be used within GuideProvider");
  }
  return context;
}
