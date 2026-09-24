export const cluster = {
  id: "cluster",
  // No `route` guard on the whole chapter - the create-cluster modal can
  // be opened from more than one page (Dashboard, Sidebar).
  isDone: (ctx) => (ctx.stats.totalClusters || 0) > 0,
  when: (ctx) => !ctx.isViewer,
  steps: [
    {
      id: "cluster-name",
      target: '[data-tour="cluster-name"]',
      action: true,
      title: "Name your cluster",
      body: "Give it a name, like the exam it's for, then press Create Cluster.",
      advance: { on: "click", selector: '[data-tour="cluster-submit"]' },
    },
  ],
};

