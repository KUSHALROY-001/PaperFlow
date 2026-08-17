import { Code2, ImageIcon, Search, X } from "lucide-react";

const fieldClass =
  "px-3 py-2 text-sm rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30";

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "needs_review", label: "Needs review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const TYPE_OPTIONS = [
  { value: "", label: "Any type" },
  { value: "single", label: "Single-select" },
  { value: "multi", label: "Multi-select" },
];

// Cycles undefined -> true -> false -> undefined on click, so one button
// covers "don't care" / "must have" / "must not have" without a separate
// tri-state widget - matches how few and simple this codebase's other
// toggle-style filters are (plain on/off buttons elsewhere) rather than
// introducing a new control pattern just for these two.
function TriStateToggle({ icon: Icon, label, value, onChange }) {
  const stateLabel =
    value === true ? "Yes" : value === false ? "No" : "Any";

  const handleClick = () => {
    if (value === undefined) onChange(true);
    else if (value === true) onChange(false);
    else onChange(undefined);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all ${
        value === undefined
          ? "border-border bg-card text-muted-foreground hover:bg-muted"
          : "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}: {stateLabel}
    </button>
  );
}

export default function BankFilters({
  searchInput,
  setSearchInput,
  topic,
  setTopic,
  status,
  setStatus,
  questionType,
  setQuestionType,
  hasCode,
  setHasCode,
  hasDiagram,
  setHasDiagram,
  topics,
}) {
  const hasActiveFilters =
    topic || status || questionType || hasCode !== undefined || hasDiagram !== undefined;

  const clearFilters = () => {
    setTopic("");
    setStatus("");
    setQuestionType("");
    setHasCode(undefined);
    setHasDiagram(undefined);
  };

  return (
    <div className="surface-card rounded-2xl border border-border p-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search question text across every mock test..."
          className={`${fieldClass} w-full pl-9`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={fieldClass}
        >
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={fieldClass}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value)}
          className={fieldClass}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <TriStateToggle
          icon={Code2}
          label="Code"
          value={hasCode}
          onChange={setHasCode}
        />
        <TriStateToggle
          icon={ImageIcon}
          label="Diagram"
          value={hasDiagram}
          onChange={setHasDiagram}
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
