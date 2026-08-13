import { FileText, Zap } from "lucide-react";

// Extracted from pages/MockTestWorkspace.jsx — no behavior changes.

export const tabs = [
  { id: "overview", label: "Overview" },
  { id: "processing", label: "Processing" },
  { id: "review", label: "Review" },
  { id: "output", label: "Output" },
  { id: "submissions", label: "Submissions" },
];

export const statusConfig = {
  published: {
    color:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    dot: "bg-emerald-500",
    label: "Ready",
  },
  review: {
    color:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    dot: "bg-amber-500",
    label: "Needs Review",
  },
  processing: {
    color:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
    dot: "bg-orange-500 animate-pulse",
    label: "Processing",
  },
  draft: {
    color: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
    label: "Draft",
  },
  archived: {
    color: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
    label: "Archived",
  },
};

export function mapQuestion(question) {
  const options = question.options?.map((option) => option.optionText) || [];
  const correctIndex = question.correct_option_indexes?.[0] ?? 0;
  const metadata = question.metadata || {};
  const aiIssues = Array.isArray(metadata.aiIssues) ? metadata.aiIssues : [];
  const normalizedStatus = ["approved", "rejected"].includes(question.status)
    ? question.status
    : "review";

  return {
    id: question.id,
    questionNo: question.question_no,
    topic: question.topic || "Untitled",
    confidence: question.confidence || 100,
    status: normalizedStatus,
    text: question.question_text,
    sourceLine: question.source_page
      ? `Page ${question.source_page}`
      : "Manual entry",
    options,
    answer: options[correctIndex] || "",
    correctOptionIndexes: question.correct_option_indexes || [correctIndex],
    aiIssues,
    aiNeedsReview: metadata.aiNeedsReview,
    // Bug fix: these three were never mapped through at all, even though
    // the raw API row (mock-tests.service.js#listQuestions - a plain
    // `SELECT q.*` plus attachDiagramUrls) already has them. OutputTab and
    // ReviewTab both consume mapQuestion's output, not the raw row, so
    // every question rendered through either tab looked like it had no
    // diagram and no code formatting regardless of what was actually
    // extracted - see components/shared/QuestionContent.jsx.
    diagramUrl: question.diagramUrl,
    hasCode: question.has_code || false,
    codeLanguage: question.code_language || null,
  };
}

// Attempt-review "options" (from GET /attempts/:id, backend
// listQuestionsWithAnswersForAttempt) come as [{ optionIndex, optionText }]
// objects, not plain strings - unlike mapQuestion's `options` above which
// is already flattened. Resolve by matching optionIndex rather than trusting
// array position, since jsonb_agg ordering isn't a index-into-array guarantee.
export function getOptionText(options, index) {
  if (!Array.isArray(options)) return "";
  const match = options.find((option) => option?.optionIndex === index);
  return match?.optionText ?? "";
}

export function normalizeJobStage(stage = "") {
  return stage.toLowerCase();
}

export function buildProcessingPhases(mocktest, latestJob) {
  const isProcessing = mocktest?.status === "processing";
  const hasQuestions = Number(mocktest?.total_questions || 0) > 0;
  const stage = normalizeJobStage(latestJob?.current_stage);
  const progress = Number(latestJob?.progress_percent || 0);
  const isFailed = latestJob?.status === "failed";

  const statusFor = (threshold, stageMatchers = []) => {
    if (isFailed) return "pending";
    if (
      hasQuestions ||
      latestJob?.status === "completed" ||
      progress >= threshold
    )
      return "complete";
    if (
      isProcessing &&
      stageMatchers.some((matcher) => stage.includes(matcher))
    )
      return "active";
    return "pending";
  };

  return [
    {
      title: "Phase 1: Upload & AI Extraction",
      icon: FileText,
      steps: [
        {
          label: "PDF uploaded",
          status: latestJob || hasQuestions ? "complete" : "pending",
        },
        {
          label: "OCR searchable PDF",
          status: statusFor(45, ["ocr", "converting scanned"]),
        },
        {
          label: "PDF text extracted",
          status: statusFor(55, ["extracting", "parsing"]),
        },
        { label: "AI cleanup", status: statusFor(75, ["ai cleanup"]) },
      ],
    },
    {
      title: "Phase 2: Review & Export",
      icon: Zap,
      steps: [
        { label: "Question detection", status: statusFor(80, ["parsing"]) },
        { label: "Option parsing", status: statusFor(80, ["parsing"]) },
        {
          label: "Answer extraction",
          status: statusFor(80, ["ai cleanup", "saving"]),
        },
        {
          label: "Ready for JSON export",
          status: hasQuestions
            ? "complete"
            : isProcessing
              ? "active"
              : "pending",
        },
      ],
    },
  ];
}
