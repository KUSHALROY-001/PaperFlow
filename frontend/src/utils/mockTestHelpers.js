import {
  ClipboardCheck,
  Download,
  FileText,
  ListChecks,
  ScanSearch,
  ScanText,
  Sparkles,
  UploadCloud,
} from "lucide-react";

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

export function normalizeOptionText(option) {
  return typeof option === "string" ? option : option?.optionText || "";
}

export function mapQuestion(question) {
  const options = question.options?.map(normalizeOptionText) || [];
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
    subtopic: question.subtopic || null,
    passage: question.passage || null,
    confidence: question.confidence || 100,
    status: normalizedStatus,
    text: question.question_text,
    explanation: question.explanation || null,
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
    // Part C: where the diagram renders relative to text/options - see
    // attachDiagramUrls, which sets this whenever any asset exists.
    placement: question.placement || "below_text",
    // Inline ![[img:slot]] markers (Review/Output tabs) need the full
    // slot map, not just the legacy single diagramUrl.
    diagramAssets: question.diagramAssets || [],
  };
}

export function getOptionText(options, index) {
  if (!Array.isArray(options)) return "";
  if (typeof options[index] === "string") return options[index];
  const match = options.find((option) => option?.optionIndex === index);
  return match?.optionText ?? "";
}

export function normalizeJobStage(stage = "") {
  return stage.toLowerCase();
}

// Feeds ProcessingTimeline.jsx - a single connected vertical list of steps
// (replaced the old two-side-by-side-cards layout, PhaseCard in
// ProcessingTab.jsx). Flat rather than grouped into phases: the reference
// design has no phase grouping at all, just one continuous timeline, and
// nothing else in the app read the phase-level title/icon this used to
// carry (only MockTestWorkspace.jsx consumed the old buildProcessingPhases
// output, and only to hand it straight to ProcessingTab).
//
// The worker (worker/worker.py) only ever reports ~6 distinct stages -
// "Extracting PDF text"(20), "Converting scanned PDF with OCR"(35),
// "Parsing questions"(55), "AI cleanup (text X/Y)"(68, repeated per chunk -
// see worker/ai/provider.py#report), "Saving questions"(80), "Completed"
// (100) - but this timeline shows 8 UI steps, so several steps below
// necessarily share the same backend threshold/stage keyword (e.g. "AI
// cleanup", "Question detection" and "Option parsing" all correspond to
// the same "AI cleanup" stage - the worker never reports detection and
// parsing separately). Picking the single FURTHEST-reached step as the
// only "active" one (and treating every earlier step - including ones
// that share its threshold - as already "complete") is what keeps exactly
// one step "Processing" at a time instead of every same-threshold step
// lighting up together.
const PROCESSING_STEP_DEFS = [
  {
    label: "PDF uploaded",
    description: "Your file has been uploaded successfully",
    icon: UploadCloud,
    threshold: 0,
  },
  {
    label: "OCR searchable PDF",
    description: "Scanned PDF is now OCR searchable",
    icon: ScanText,
    threshold: 35,
  },
  {
    label: "PDF text extracted",
    description: "Text content extracted from PDF",
    icon: FileText,
    threshold: 55,
  },
  {
    label: "AI cleanup",
    description: "Cleaning and structuring extracted text using AI",
    icon: Sparkles,
    threshold: 68,
  },
  {
    label: "Question detection",
    description: "Identifying questions in the cleaned text",
    icon: ScanSearch,
    threshold: 68,
  },
  {
    label: "Option parsing",
    description: "Extracting options for each question",
    icon: ListChecks,
    threshold: 68,
  },
  {
    label: "Answer extraction",
    description: "Identifying the correct answer for each question",
    icon: ClipboardCheck,
    threshold: 80,
  },
  {
    label: "Ready for export",
    description: "Finalizing questions for review and export",
    icon: Download,
    threshold: 100,
  },
];

// "Generate from existing tests" has no PDF, no OCR, no page-by-page
// parsing - process_generation_job (worker.py) only ever reports 3
// distinct progress checkpoints (20/60/80, then 100 on completion), so
// this list mirrors those exactly rather than reusing PROCESSING_STEP_DEFS'
// PDF-shaped steps, which would show "PDF uploaded"/"OCR searchable PDF"
// for a job that was never given a PDF at all.
const GENERATION_STEP_DEFS = [
  {
    label: "Sources selected",
    description: "Topic breakdown computed from the selected mock test(s)",
    icon: ListChecks,
    threshold: 0,
  },
  {
    label: "Generating questions",
    description: "AI is writing new questions matching that topic shape",
    icon: Sparkles,
    threshold: 20,
  },
  {
    label: "Saving questions",
    description: "Validating and saving the generated question set",
    icon: ClipboardCheck,
    threshold: 80,
  },
  {
    label: "Ready for export",
    description: "Finalizing questions for review and export",
    icon: Download,
    threshold: 100,
  },
];

export function buildProcessingSteps(mocktest, latestJob) {
  const isGenerated =
    latestJob?.input_config?.documentType === "generate_from_existing";
  const stepDefs = isGenerated ? GENERATION_STEP_DEFS : PROCESSING_STEP_DEFS;

  const isProcessing = mocktest?.status === "processing";
  const hasQuestions = Number(mocktest?.total_questions || 0) > 0;
  const progress = Number(latestJob?.progress_percent || 0);
  const isFailed = latestJob?.status === "failed";

  if (isFailed) {
    return stepDefs.map((step) => ({ ...step, status: "pending" }));
  }

  if (hasQuestions || latestJob?.status === "completed") {
    return stepDefs.map((step) => ({
      ...step,
      status: "complete",
    }));
  }

  if (!latestJob) {
    return stepDefs.map((step) => ({ ...step, status: "pending" }));
  }

  // The single furthest step whose threshold we've reached - the LAST
  // match wins on purpose, so a tied group (three steps at threshold 68)
  // collapses to its final member instead of its first.
  let activeIndex = 0;
  stepDefs.forEach((step, index) => {
    if (progress >= step.threshold) {
      activeIndex = index;
    }
  });

  return stepDefs.map((step, index) => {
    let status;
    if (index < activeIndex) status = "complete";
    else if (index === activeIndex)
      status = isProcessing ? "active" : "pending";
    else status = "pending";
    return { ...step, status };
  });
}

export function buildDocumentPreview({
  latestJob,
  isGenerated,
  aiSummary = {},
  ocrSummary = {},
  questionsCount = 0,
}) {
  if (isGenerated) {
    return [
      latestJob?.current_stage || "Preparing generation...",
      `Requested ${latestJob?.input_config?.targetQuestionCount ?? "?"} question(s), difficulty: ${latestJob?.input_config?.difficultyHint || "Variable"}.`,
      aiSummary.attempted
        ? `AI: ${aiSummary.questionsGenerated ?? 0} question(s) generated.`
        : "AI generation summary will appear here.",
      aiSummary.errors?.length
        ? `${aiSummary.errors.length} topic group(s) failed to generate and were skipped.`
        : null,
      `${questionsCount} question(s) currently saved.`,
    ].filter(Boolean);
  }

  return [
    latestJob?.current_stage || "Waiting for a PDF upload.",
    ocrSummary.error
      ? `OCR: ${ocrSummary.error}`
      : ocrSummary.converted
        ? `OCR converted ${ocrSummary.pagesOcrd || 0} page(s) into a searchable PDF.`
        : "OCR summary will appear here when scanned pages are detected.",
    aiSummary.enabled
      ? `AI: ${aiSummary.questionsFromAi || 0} question(s) returned by ${aiSummary.provider}.`
      : "AI processing summary will appear here.",
    // Only present when the mock test came from a template with at
    // least one section carrying its own marksPerCorrect/
    // negativeMarksPerWrong (see ai/provider.py#_apply_section_marks)
    // - omitted from the array entirely otherwise, same as the
    // templateMatch line would be if we surfaced that here too.
    aiSummary.sectionMarksApplied?.questionsMatched
      ? `Applied section-specific marking to ${aiSummary.sectionMarksApplied.questionsMatched} question(s).`
      : null,
    `${questionsCount} question(s) currently saved.`,
  ].filter(Boolean);
}

