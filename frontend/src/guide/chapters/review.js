export const review = {
  id: "review",
  route: /\/mocktest\/[^/]+/,
  when: (ctx) => !ctx.isViewer,
  steps: [
    {
      id: "first-card",
      target: '[data-tour="review-first-card"]',
      // The guide itself switches the app to the Review tab right
      // before this chapter starts (see GuideProvider.jsx's
      // goToReviewChapter) - no separate "click the Review tab" step
      // needed. The longer timeout covers the case where that meant a
      // fresh navigation (person was elsewhere when extraction
      // finished), so this step's target needs to wait on both the
      // route change and the questions list's own fetch.
      waitTimeout: 8000,
      title: "Each question, one at a time",
      body: "Confidence score, topic, and marks are shown for every extracted question.",
      advance: { on: "manual" },
    },
    {
      id: "actions",
      target: '[data-tour="review-actions"]',
      placement: "left",
      title: "Approve or flag",
      body: "Approve a question once it looks right, or flag it if something's off.",
      advance: { on: "manual" },
    },
    {
      id: "edit",
      target: '[data-tour="review-edit"]',
      placement: "left",
      title: "Fine-tune in the editor",
      body: "Open the Question Editor to fix the stem, options, math, or diagrams. From there you can Publish and Share when you're happy with the set.",
      advance: { on: "manual" },
    },
  ],
};
