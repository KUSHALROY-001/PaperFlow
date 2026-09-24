export const processing = {
  id: "processing",
  route: /\/mocktest\/[^/]+/,
  // No mock test with an upload/generate job (e.g. Start Blank) never
  // gets a "processing-live" anchor to spotlight - skip the chapter
  // instead of stalling on a target that will never appear.
  when: (ctx) => Boolean(ctx.hasProcessingJob),
  steps: [
    {
      id: "status",
      target: '[data-tour="mock-status"]',
      title: "Track progress here",
      body: "This badge shows where your mock test is: processing, ready, or published.",
      advance: { on: "manual" },
    },
    {
      id: "live",
      target: '[data-tour="processing-live"]',
      parkable: true,
      title: "Extraction runs in the background",
      body: "Questions are being pulled from your document. Feel free to leave this page - we'll pick this back up when it's done.",
      advance: { on: "manual" },
    },
    {
      id: "wait",
      target: '[data-tour="processing-live"]',
      parkable: true,
      title: "Extraction in progress",
      body: "Hang tight - this can take a few minutes depending on the document.",
      advance: {
        on: "query",
        key: ["processing-jobs", "mock-test", ":mockTestId"],
        when: (data) => data?.jobs?.[0]?.status === "completed",
      },
    },
  ],
};
