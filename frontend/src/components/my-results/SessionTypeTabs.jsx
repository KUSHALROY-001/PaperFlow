import { FileText, ListChecks } from "lucide-react";

// Sits above ResultsFilterTabs.jsx (which filters passed/failed WITHIN
// whichever session type is selected here) - this is the split the whole
// page was missing: a full mock test attempt (attempt.topic === null) and
// a topic-wise practice attempt (attempt.topic set - see
// migrations/016_exam_attempts_topic.sql) were previously interleaved in
// one flat list with nothing to tell them apart.
export default function SessionTypeTabs({
  sessionType,
  setSessionType,
  fullCount,
  practiceCount,
}) {
  const tabs = [
    { id: "full", label: "Full Mock Tests", count: fullCount, icon: FileText },
    {
      id: "practice",
      label: "Topic Practice",
      count: practiceCount,
      icon: ListChecks,
    },
  ];

  return (
    <div className="flex gap-2 border-b border-border">
      {tabs.map((tab) => {
        const active = sessionType === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSessionType(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 -mb-px transition-colors ${
              active
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
            <span
              className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold ${
                active
                  ? "bg-orange-500/15 text-orange-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
