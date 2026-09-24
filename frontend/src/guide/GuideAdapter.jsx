import { ACTIONS, EVENTS, Joyride } from "react-joyride";
import GuideTooltip from "./GuideTooltip";
import useTheme from "../components/useTheme";

// Matches index.css's --card value for each theme - the same background
// GuideTooltip's "surface-card" class resolves to. Joyride renders its
// connector arrow (the little triangle linking the floater to its target)
// itself, independently of the custom tooltipComponent below, so it needs
// its own color kept in sync with the card background by hand rather than
// picking it up from CSS the way the rest of the tooltip does.
const ARROW_COLOR_BY_THEME = {
  light: "#ffffff",
  dark: "#151518",
};

// Renders the single currently-active step. GuideProvider hands us a
// fully-resolved `activeStep` (its DOM target already confirmed to
// exist and be visible - see conditions.js#waitForElement) plus the
// callbacks that move the chapter forward. We deliberately run Joyride
// in controlled mode with a ONE-element steps array rather than handing
// it the whole chapter: chapters cross routes and modals, wait on
// background jobs, and get their targets from a MutationObserver, none
// of which Joyride's own step-sequencing knows how to do. Joyride here
// is purely the spotlight+tooltip renderer for whichever step
// GuideProvider says is current.
//
// The tooltip's Next/Back/Skip buttons are wired to GuideProvider's own
// chapter-level navigation (via the `progress` prop passed through to
// GuideTooltip) rather than Joyride's internal step index, which would
// be meaningless for a 1-item array. Next always works as a manual
// escape hatch, in addition to whatever this step's real `advance`
// condition is separately watching for (see conditions.js#subscribeAdvance,
// wired up in GuideProvider) - so a person is never stuck waiting on a
// detector that failed to fire.
export default function GuideAdapter({
  activeStep,
  stepNumber,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  onTargetNotFound,
}) {
  const { resolvedTheme } = useTheme();

  if (!activeStep) return null;

  const { def, element } = activeStep;

  const joyrideStep = {
    // Let Joyride resolve the selector immediately before it positions the
    // spotlight. Keeping the HTMLElement captured while the provider waited
    // for it can leave Joyride anchored to a node that React has since
    // replaced (notably when the review cards refresh).
    target: typeof def.target === "string" ? def.target : element,
    title: def.title,
    content: def.body,
    // Pick the side with the usable space for every tour target. This keeps
    // a tooltip next to its marker on cards, nav items, modal fields, and
    // header controls instead of forcing all unspecified steps below it.
    placement: def.placement || "auto",
    // The application header is `sticky top-0` and 64px high. Joyride's
    // 20px default scroll offset places a newly targeted control underneath
    // it, which is why only a dark spotlight circle was visible after the
    // page jumped. Leave the header plus a small visual gap above every
    // guide target.
    scrollOffset: def.scrollOffset ?? 80,
    disableFocusTrap: Boolean(def.action),
    spotlightClicks: def.advance?.on === "click" || Boolean(def.action),
    blockTargetInteraction: false,
    targetWaitTimeout: 4000,
  };

  const progress = {
    index: stepNumber - 1,
    size: totalSteps,
    isLastStep: stepNumber === totalSteps,
    onNext,
    onBack: stepNumber > 1 ? onBack : undefined,
    onSkip,
  };

  const handleEvent = (data) => {
    if (data.type === EVENTS.TARGET_NOT_FOUND) {
      onTargetNotFound?.();
      return;
    }
    if (
      data.type === EVENTS.STEP_AFTER &&
      (data.action === ACTIONS.CLOSE || data.action === ACTIONS.SKIP)
    ) {
      onSkip();
    }
    // ACTIONS.NEXT / ACTIONS.PREV are handled directly by the
    // tooltip's overridden button onClick (see `progress` above), not
    // here - by the time this fires Joyride has already tried to move
    // its own (1-item) internal index, which we ignore.
  };

  return (
    <Joyride
      key={`${def.id}-${stepNumber}`}
      steps={[joyrideStep]}
      stepIndex={0}
      run
      continuous={false}
      disableOverlayClose
      disableCloseOnEsc={false}
      scrollToFirstStep
      tooltipComponent={(props) => (
        <GuideTooltip {...props} progress={progress} />
      )}
      options={{
        zIndex: 2000,
        overlayColor: "rgba(0, 0, 0, 0.5)",
        // In Joyride v3 these are options, not `styles.options`. Passing
        // them through styles made Joyride fall back to its black beacon.
        // A white beacon keeps the attention marker clear on dark surfaces.
        primaryColor: resolvedTheme === "dark" ? "#ffffff" : "#000000 ",
        arrowColor:
          ARROW_COLOR_BY_THEME[resolvedTheme] ?? ARROW_COLOR_BY_THEME.light,
      }}
      styles={
        resolvedTheme === "dark"
          ? {
              // A spotlight is normally only a cutout in the dimmed overlay.
              // On PaperFlow's near-black surfaces that cutout can blend into
              // its surroundings, so give the active area a clear but subtle
              // white boundary in dark mode.
              spotlight: {
                stroke: "rgba(255, 255, 255, 0.8)",
                strokeWidth: 2,
              },
            }
          : undefined
      }
      callback={handleEvent}
    />
  );
}
