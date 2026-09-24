export const addMockTest = {
  id: "add-mock-test",
  // Runs right after the `cluster` chapter finishes and the person has
  // landed on their new cluster's page - same route the old, folded-in
  // step used, now promoted to its own chapter (see chapters/cluster.js,
  // which used to end with this as its second step).
  route: /^\/cluster\/[^/]+$/,
  // Reuses the wizard chapter's own "done" signal (a mock test already
  // exists) rather than tracking its own: clicking Add Mock Test is a
  // means to that same end, so once it's true there's nothing left for
  // either chapter to show.
  isDone: (ctx) => (ctx.stats.totalMockTests || 0) > 0,
  when: (ctx) => !ctx.isViewer,
  steps: [
    {
      id: "open-wizard",
      target: '[data-tour="add-mock-test"]',
      title: "Add a mock test",
      body: "Mock tests live inside a cluster. Click here to add your first one.",
      advance: { on: "click" },
    },
  ],
};
