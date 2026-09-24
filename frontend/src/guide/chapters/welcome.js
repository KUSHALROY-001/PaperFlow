export const welcome = {
  id: "welcome",
  route: /^\/dashboard/,
  steps: [
    {
      id: "intro",
      target: "body",
      placement: "center",
      title: "Welcome to PaperFlow",
      body: "Quick tour: create a cluster, add a mock test, and watch it get extracted and reviewed. Takes about two minutes - skip anytime.",
      advance: { on: "manual" },
    },
    {
      id: "nav",
      target: '[data-tour="nav"]',
      when: (ctx) => ctx.isDesktop,
      placement: "right",
      title: "Your workspace",
      body: "Clusters, Active Jobs, Review Queue and Templates all live here.",
      advance: { on: "manual" },
    },
    {
      id: "new-cluster",
      target: '[data-tour="new-cluster"]',
      title: "Start with a cluster",
      body: "A cluster groups related mock tests, like JECA or GATE. Click here to create your first one.",
      advance: { on: "click" },
    },
  ],
};
