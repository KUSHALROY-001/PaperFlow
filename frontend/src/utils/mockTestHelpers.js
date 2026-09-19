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
  const questionType = question.question_type || "single";
  // Bug fix: numeric_answer/numeric_tolerance were never mapped through at
  // all (same shape of miss as diagramUrl/marks below), and `answer` was
  // unconditionally derived from `options[correctIndex]` - which is empty
  // for numerical questions (no options), so it always came out "".
  // useQuestionEditor.js was unaffected because it goes through
  // toEditorQuestion (questionEditorHelpers.js), a separate mapper that
  // already handled these two fields - only OutputTab/ReviewTab, which
  // render mapQuestion's output, showed a blank answer.
  const numericAnswer = question.numeric_answer ?? null;
  const numericTolerance = question.numeric_tolerance ?? null;
  // Same gap as numericAnswer/numericTolerance above, for the other three
  // non-MCQ types (fill_blank, short_answer, long_answer) - these were
  // never mapped through at all, so OutputTab/ReviewTab had literally
  // nothing to render for those questions: no options (there are none for
  // these types), and no answer-key field either. useQuestionEditor.js
  // was unaffected for the same reason as before - it reads the raw API
  // response via toEditorQuestion, a separate mapper.
  const acceptedAnswers = Array.isArray(question.accepted_answers)
    ? question.accepted_answers
    : null;
  const gradingRubric = Array.isArray(question.grading_rubric)
    ? question.grading_rubric
    : null;
  const expectedAnswer = question.expected_answer ?? null;
  const answerWordLimit = question.answer_word_limit ?? null;

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
    questionType,
    answer:
      questionType === "numerical"
        ? (numericAnswer ?? "")
        : options[correctIndex] || "",
    correctOptionIndexes:
      question.correct_option_indexes ||
      (["single", "multi"].includes(questionType) ? [correctIndex] : []),
    numericAnswer,
    numericTolerance,
    acceptedAnswers,
    gradingRubric,
    expectedAnswer,
    answerWordLimit,
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
    // Inline ![[img:slot]] markers (Review/Output tabs) need the full
    // slot map, not just the legacy single diagramUrl.
    diagramAssets: question.diagramAssets || [],
    // Bug fix: marks were never mapped through either, for the same
    // reason diagramUrl wasn't above - mapQuestion() just didn't list
    // them. The raw row always had them (mock-tests.service.js#listQuestions
    // selects q.* from the `questions` view, which exposes both columns -
    // see migrations/030_shared_question_content.sql), and
    // useQuestionEditor.js reads them fine because it uses the raw API
    // response directly rather than going through mapQuestion. But
    // OutputTab/ReviewTab both render mapQuestion's output, so every
    // question there showed "Marks unset" via MarksBadge regardless of
    // what was actually saved, even right after the question editor
    // itself showed the correct values.
    marksPerCorrect: coerceMark(
      question.marksPerCorrect ?? question.marks_per_correct,
    ),
    negativeMarksPerWrong: coerceMark(
      question.negativeMarksPerWrong ?? question.negative_marks_per_wrong,
    ),
    // review_flags (migrations/052_question_slot_review_flags.sql) is how
    // worker.py#flag_orphaned_question_slots marks a slot that a
    // completed reprocess run never touched - see that function's own
    // comment for why it's flagged rather than silently kept or deleted.
    // Only this one flag exists today, but read generically off the bag
    // rather than a dedicated column so a future flag doesn't need its
    // own migration + mapper change.
    staleFromReprocess: Boolean(question.review_flags?.staleFromReprocess),
    staleReason: question.review_flags?.staleReason || null,
  };
}

export function coerceMark(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getMockTestSettings(mockTest) {
  const raw = mockTest?.settings;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? raw : {};
}

export function getQuestionOrderMode(mockTest) {
  const settings = getMockTestSettings(mockTest);
  const order = settings.questionOrder || settings.question_order;
  return order === "random" ? "random" : "sequential";
}

// Same rules as attempts.service.js#resolveQuestionMarks: a question-level
// value for EITHER field is a full override (the missing half becomes 0).
// Only when both are empty do we fall through to the mock test's paper
// defaults. Review/Output/editor badges used to look only at the question
// row, so saving Global Scoring left every card on "Marks unset".
export function resolveQuestionMarks(question, mockTest) {
  const hasMarks = coerceMark(
    question?.marksPerCorrect ?? question?.marks_per_correct,
  );
  const hasNegative = coerceMark(
    question?.negativeMarksPerWrong ?? question?.negative_marks_per_wrong,
  );
  const hasQuestionOverride = hasMarks !== null || hasNegative !== null;

  if (hasQuestionOverride) {
    return {
      marksPerCorrect: hasMarks ?? 0,
      negativeMarksPerWrong: hasNegative ?? 0,
    };
  }

  return {
    marksPerCorrect: coerceMark(
      mockTest?.marks_per_correct ?? mockTest?.marksPerCorrect,
    ),
    negativeMarksPerWrong: coerceMark(
      mockTest?.negative_marks_per_wrong ?? mockTest?.negativeMarksPerWrong,
    ),
  };
}

function hashStringToSeed(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), t | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

// Student attempts shuffle per attempt (attempts.service.js#startAttempt).
// Authoring surfaces need a stable preview of that mode so Review/Output/
// the editor are not stuck in question_no order after "random" is saved.
// Seeded by mock-test id so reload/tab-switch keeps the same preview.
export function orderQuestionsForDisplay(questions, mockTest) {
  const list = [...(questions || [])];
  list.sort(
    (a, b) => (Number(a.questionNo) || 0) - (Number(b.questionNo) || 0),
  );
  if (getQuestionOrderMode(mockTest) !== "random" || list.length < 2) {
    return list;
  }

  const rand = mulberry32(hashStringToSeed(mockTest.id));
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Review/Output/editor list shape: shuffled when random, plus the marks
// students actually see (paper default when the question row is empty).
export function decorateQuestionsForWorkspace(questions, mockTest) {
  return orderQuestionsForDisplay(questions, mockTest).map(
    (question, index) => ({
      ...question,
      displayIndex: index + 1,
      effectiveMarks: resolveQuestionMarks(question, mockTest),
    }),
  );
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

  let ocrLine;
  if (ocrSummary.error) {
    ocrLine = `OCR: ${ocrSummary.error}`;
  } else if (ocrSummary.converted) {
    ocrLine = `OCR converted ${ocrSummary.pagesOcrd || 0} page(s) into a searchable PDF.`;
  } else {
    ocrLine = "OCR summary will appear here when scanned pages are detected.";
  }

  return [
    latestJob?.current_stage || "Waiting for a PDF upload.",
    ocrLine,
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
