// Small, dependency-free helpers the guide's step engine (GuideProvider)
// builds on. Kept separate from GuideProvider so the waiting/matching
// logic can be reasoned about (and unit-tested) without React in the
// picture.

// Resolves once an element matching `selector` exists AND is actually
// visible (has a non-empty client rect) - this matters because several
// anchors (the desktop sidebar nav, the mobile stats grid) are present
// in the DOM but `hidden` at some breakpoints, and a hidden target would
// make Joyride's spotlight point at nothing.
export function waitForElement(selector, { timeout = 4000, signal } = {}) {
  const find = () => {
    const el = document.querySelector(selector);
    return el && el.getClientRects().length > 0 ? el : null;
  };

  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(null);
      return;
    }

    const existing = find();
    if (existing) {
      resolve(existing);
      return;
    }

    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(value);
    };

    const onAbort = () => done(null);
    signal?.addEventListener("abort", onAbort);

    const observer = new MutationObserver(() => {
      const el = find();
      if (el) done(el);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    const timer = setTimeout(() => done(null), timeout);
  });
}

// `route` on a step is a RegExp tested against the current pathname.
// Steps with no `route` are treated as valid on any page (e.g. a
// centered welcome card, or a step inside a modal that can be opened
// from more than one page).
export function routeMatches(step, pathname) {
  if (!step.route) return true;
  return step.route.test(pathname);
}

// Subscribes to whichever advance condition a step declares and calls
// `onSatisfied` exactly once. Returns an unsubscribe/cleanup function.
// `ctx` carries the pieces a condition might need: the resolved target
// element, the react-query client, and the current location.
export function subscribeAdvance(step, ctx, onSatisfied) {
  const advance = step.advance;
  if (!advance) return () => {};

  if (advance.on === "manual") {
    // Nothing to subscribe to - GuideAdapter calls onSatisfied itself
    // when the person clicks the tooltip's Next/primary button.
    return () => {};
  }

  if (advance.on === "click") {
    const selector = advance.selector || step.target;
    const handler = (event) => {
      const el = event.target.closest?.(selector);
      if (el) onSatisfied();
    };
    // Capture phase, and we never call preventDefault/stopPropagation -
    // the whole point is to observe the real click going through to the
    // app's own handler, not to intercept it.
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }

  if (advance.on === "element") {
    let cancelled = false;
    const controller = new AbortController();
    waitForElement(advance.selector, {
      timeout: ELEMENT_WATCH_TIMEOUT,
      signal: controller.signal,
    }).then((el) => {
      if (!cancelled && el) onSatisfied();
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }

  if (advance.on === "route") {
    // Polled from GuideProvider's own location effect instead of here -
    // route changes are already the thing that re-runs the step engine,
    // so this condition is checked there rather than duplicating a
    // location subscription. Nothing to attach.
    return () => {};
  }

  if (advance.on === "query" && ctx.queryClient) {
    const key = advance.key.map((part) =>
      part === ":mockTestId" ? ctx.ids.mockTestId : part,
    );
    const check = () => {
      const data = ctx.queryClient.getQueryData(key);
      if (advance.when(data)) onSatisfied();
    };
    check();
    const unsubscribe = ctx.queryClient
      .getQueryCache()
      .subscribe((event) => {
        if (event?.query?.queryKey && sameKey(event.query.queryKey, key)) {
          check();
        }
      });
    return unsubscribe;
  }

  return () => {};
}

function sameKey(a, b) {
  return (
    a.length === b.length && a.every((part, index) => part === b[index])
  );
}

// waitForElement's timeout needs an actual large number for `element`
// advance conditions, since the function always arms a timer and this
// condition should keep watching for as long as the step stays on
// screen (30 minutes is effectively "don't give up").
export const ELEMENT_WATCH_TIMEOUT = 30 * 60 * 1000;
