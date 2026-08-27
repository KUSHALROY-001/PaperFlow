// Extracted from pages/Templates.jsx — no behavior changes except one fix
// (see mapTemplate's rating handling below).

export const CATEGORY_OPTIONS = [
  { label: "All", value: null },
  { label: "Entrance Exam", value: "entrance_exam" },
  { label: "Government Exam", value: "government_exam" },
  { label: "Banking Exam", value: "banking_exam" },
  { label: "School Exam", value: "school_exam" },
  { label: "Custom", value: "custom" },
  { label: "Study Notes", value: "study_notes" },
];

export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORY_OPTIONS.filter((c) => c.value).map((c) => [c.value, c.label]),
);

// Mirrors extraction-templates.service.js's SORT_OPTIONS exactly - replaces
// the old is_popular flag (migration
// 037_remove_template_is_popular.sql) with a choice between real signals
// (actual usage, actual submitted ratings) instead of one manually-set,
// admin-only flag.
export const SORT_OPTIONS = [
  { label: "Most Used", value: "usage" },
  { label: "Top Rated", value: "rating" },
  { label: "Name", value: "name" },
];

export const colorMap = {
  orange: "bg-orange-500/10 text-orange-500 border border-orange-500/20",
  blue: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  emerald: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  rose: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
  teal: "bg-teal-500/10 text-teal-500 border border-teal-500/20",
  purple: "bg-purple-500/10 text-purple-500 border border-purple-500/20",
  indigo: "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20",
};

export const iconBgMap = {
  orange: "bg-orange-500/15 text-orange-500",
  blue: "bg-blue-500/15 text-blue-500",
  emerald: "bg-emerald-500/15 text-emerald-500",
  amber: "bg-amber-500/15 text-amber-500",
  rose: "bg-rose-500/15 text-rose-500",
  teal: "bg-teal-500/15 text-teal-500",
  purple: "bg-purple-500/15 text-purple-500",
  indigo: "bg-indigo-500/15 text-indigo-500",
};

// mock_tests.duration_minutes has no display-string equivalent, so this
// derives "3 hrs" / "1.5 hrs" / "20 min" / "Variable" the same way the
// original hardcoded data expressed it.
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return "Variable";
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  const rounded = Number.isInteger(hours) ? hours : Math.round(hours * 10) / 10;
  return `${rounded} hr${rounded === 1 ? "" : "s"}`;
}

// Normalizes a raw extraction_templates row (already camelCased by
// extraction-templates.repository.js's TEMPLATE_COLUMNS) into the shape
// this page's JSX was already written against.
export function mapTemplate(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: CATEGORY_LABELS[row.category] || row.category,
    // Bug fix: these three used to read row.question_count / .duration_minutes
    // / .usage_count (snake_case). TEMPLATE_COLUMNS aliases
    // every multi-word column to camelCase in the query itself
    // (`t.question_count AS "questionCount"`, etc.) - the row this function
    // actually receives never had snake_case keys for these, so all three
    // silently evaluated to undefined for every template (rendering as
    // "undefined Qs" / always "Variable" duration / undefined uses)
    // regardless of what was actually in the DB.
    questions: row.questionCount,
    duration: formatDuration(row.durationMinutes),
    difficulty: row.difficulty,
    uses: row.usageCount,
    // Fixed: the original `row.rating === null ? null : Number(row.rating)`
    // only caught an explicit null. If the backend ever omits the field
    // instead of sending null (`undefined`), Number(undefined) is NaN,
    // and NaN isn't caught by `??` at the display site — it would render
    // the literal text "NaN" on screen instead of "—". `== null` catches
    // both null and undefined.
    rating: row.rating == null ? null : Number(row.rating),
    // ratingCount/myRating are new (see
    // migrations/036_extraction_template_ratings.sql) - ratingCount is
    // how many real submitted ratings back the average above (0 for the
    // seeded platform templates until someone actually rates one; a bare
    // average with no count is close to meaningless for trust). myRating
    // is this specific user's own rating for this template, if they've
    // given one - null otherwise, which the rating widget reads to decide
    // whether it's showing "rate this" or "you rated this".
    ratingCount: row.ratingCount ?? 0,
    myRating: row.myRating ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    color: row.color,
    sections: Array.isArray(row.sections) ? row.sections : [],
    // extraction-templates.repository.js's TEMPLATE_COLUMNS already aliases
    // these to camelCase (workspace_id AS "workspaceId", etc.) - previously
    // just never read here, so every template looked ownerless downstream
    // regardless of who actually created it. workspaceId is null for the
    // official seeded templates and set for anything a workspace created
    // itself; systemTemplate is the same fact already computed server-side
    // (`workspace_id IS NULL`) so call sites that just need a boolean don't
    // each have to redo that null-check themselves.
    workspaceId: row.workspaceId ?? null,
    createdBy: row.createdBy ?? null,
    isOwn: row.systemTemplate === false,
    // Raw (unformatted) values, kept alongside the display-formatted ones
    // above rather than replacing them - CreateTemplateModal's edit mode
    // needs the actual number to prefill a <input type="number">, not the
    // "3 hrs" string `duration` renders as everywhere else.
    questionCountRaw: row.questionCount,
    durationMinutesRaw: row.durationMinutes,
    marksPerCorrect: row.marksPerCorrect,
    negativeMarksPerWrong: row.negativeMarksPerWrong,
  };
}

export const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard", "Variable"];
export const COLOR_OPTIONS = Object.keys(colorMap);

export const fieldClass =
  "w-full px-3 py-2 text-sm rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30";
export const labelClass =
  "block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5";

let sectionKeySeed = 0;

export function makeEmptySection() {
  sectionKeySeed += 1;
  return {
    key: `new-${sectionKeySeed}`,
    name: "",
    topicsText: "",
    questionCount: "",
    marksPerCorrect: "",
    negativeMarksPerWrong: "",
  };
}

export function buildSectionPayload(section) {
  const name = section.name.trim();
  if (!name) return null;

  const payload = {
    name,
    topics: section.topicsText
      .split(",")
      .map((topic) => topic.trim())
      .filter(Boolean),
  };

  if (section.questionCount !== "") {
    payload.questionCount = Number(section.questionCount);
  }
  if (section.marksPerCorrect !== "") {
    payload.marksPerCorrect = Number(section.marksPerCorrect);
  }
  if (section.negativeMarksPerWrong !== "") {
    payload.negativeMarksPerWrong = Number(section.negativeMarksPerWrong);
  }

  return payload;
}

export function sectionRowFromTemplateSection(section, index) {
  sectionKeySeed += 1;
  return {
    key: `existing-${index}-${sectionKeySeed}`,
    name: section?.name || "",
    topicsText: Array.isArray(section?.topics) ? section.topics.join(", ") : "",
    questionCount:
      section?.questionCount === undefined || section?.questionCount === null
        ? ""
        : String(section.questionCount),
    marksPerCorrect:
      section?.marksPerCorrect === undefined ||
      section?.marksPerCorrect === null
        ? ""
        : String(section.marksPerCorrect),
    negativeMarksPerWrong:
      section?.negativeMarksPerWrong === undefined ||
      section?.negativeMarksPerWrong === null
        ? ""
        : String(section.negativeMarksPerWrong),
  };
}
