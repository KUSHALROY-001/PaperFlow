import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

export default function TopicBreakdownGrid({ topicBreakdown }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!topicBreakdown || Object.keys(topicBreakdown).length === 0) return null;

  return (
    <div className="border border-border/60 rounded-2xl p-3 sm:p-4 bg-card/50">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between text-left focus:outline-none group"
      >
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors flex items-center gap-1.5">
          Topic Breakdown
        </h4>
        <div className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-orange-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
          {Object.entries(topicBreakdown).map(
            ([topic, { correct, total }]) => (
              <div
                key={topic}
                className="bg-card rounded-xl p-3 border border-border"
              >
                <div className="text-xs font-bold text-foreground mb-1 truncate">
                  {topic}
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-1.5 flex-1 mr-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((correct / total) * 100)}%`,
                        background:
                          correct === total ? "#10B981" : "#ea580c",
                      }}
                    />
                  </div>
                  <span
                    className={`text-xs font-bold ${correct === total ? "text-emerald-500" : correct === 0 ? "text-red-500" : "text-amber-500"}`}
                  >
                    {correct}/{total}
                  </span>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
