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

// Normalizes a raw extraction_templates row (snake_case, jsonb arrays) into
// the shape this page's JSX was already written against.
export function mapTemplate(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: CATEGORY_LABELS[row.category] || row.category,
    questions: row.question_count,
    duration: formatDuration(row.duration_minutes),
    difficulty: row.difficulty,
    uses: row.usage_count,
    // Fixed: the original `row.rating === null ? null : Number(row.rating)`
    // only caught an explicit null. If the backend ever omits the field
    // instead of sending null (`undefined`), Number(undefined) is NaN,
    // and NaN isn't caught by `??` at the display site — it would render
    // the literal text "NaN" on screen instead of "—". `== null` catches
    // both null and undefined.
    rating: row.rating == null ? null : Number(row.rating),
    tags: Array.isArray(row.tags) ? row.tags : [],
    color: row.color,
    popular: row.is_popular,
    sections: Array.isArray(row.sections) ? row.sections : [],
  };
}
