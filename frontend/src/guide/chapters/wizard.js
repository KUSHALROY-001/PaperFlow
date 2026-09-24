export const wizard = {
  id: "wizard",
  isDone: (ctx) => (ctx.stats.totalMockTests || 0) > 0,
  when: (ctx) => !ctx.isViewer,
  steps: [
    {
      id: "mode",
      target: '[data-tour="mock-mode"]',
      title: "Choose a source",
      body: "Upload a PDF, generate questions from existing mock tests, or start blank. This tour follows Upload File.",
      advance: { on: "manual" },
    },
    {
      id: "upload",
      target: '[data-tour="mock-upload"]',
      action: true,
      title: "Upload a document",
      body: "Choose a PDF, Word, PowerPoint, or image file - we'll extract questions automatically.",
      advance: {
        on: "element",
        selector: '[data-tour="mock-upload"][data-has-files="true"]',
      },
    },
    {
      id: "through-steps",
      target: '[data-tour="mock-next"]',
      title: "A few quick details",
      body: "Click Next to move through Basics and Settings (duration, marking), then Review.",
      advance: { on: "click" },
    },
    {
      id: "create",
      target: '[data-tour="mock-next"]',
      title: "Create the mock test",
      body: "When you reach Review, press Create to start processing your document.",
      advance: { on: "route", match: /\/mocktest\/[^/]+/ },
    },
  ],
};
