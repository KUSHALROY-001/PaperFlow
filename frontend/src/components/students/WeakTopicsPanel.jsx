import { useState } from "react";
import { AlertTriangle, Copy, Check } from "lucide-react";
import { buildShareUrl } from "@/hooks/useShareLink";

// Same reasoning as ShareLinkModal.jsx's copiedId pattern - track which
// row was just copied so the button can flash a checkmark, cleared after
// 2s.
export default function WeakTopicsPanel({ weakTopics, isLoading }) {
  const [copiedTopic, setCopiedTopic] = useState(null);

  if (isLoading) return null;
  if (weakTopics.length === 0) return null;

  const handleCopy = async (topic, link) => {
    // ?topics= (not ?topic=) to match the repeated-param convention every
    // other topic-filtered link in the app uses - see
    // OverviewTab.jsx/useExamSession.js.
    const url = `${buildShareUrl(link.shareToken)}?topics=${encodeURIComponent(topic)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedTopic(topic);
      setTimeout(
        () => setCopiedTopic((current) => (current === topic ? null : current)),
        2000,
      );
    } catch {
      // Clipboard access can fail (permissions, insecure context) - not a
      // dead end, the admin can still go build the link manually from
      // Clusters using the topic name shown here.
    }
  };

  return (
    <div className="surface-card rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        <h2 className="text-sm font-bold text-foreground">Weak Topics</h2>
      </div>
      <div className="space-y-2.5">
        {weakTopics.map((wt) => (
          <div
            key={wt.topic}
            className="flex items-center justify-between gap-3 rounded-md bg-card border border-border px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-foreground truncate">
                {wt.weakStudentCount} of {wt.totalStudentCount}{" "}
                {wt.totalStudentCount === 1 ? "student is" : "students are"}{" "}
                weak in {wt.topic}
              </div>
              <div className="text-xs text-muted-foreground">
                Class average: {wt.avgAccuracy}% accuracy
              </div>
            </div>
            {wt.practiceLink ? (
              <button
                onClick={() => handleCopy(wt.topic, wt.practiceLink)}
                title={`Copy a practice link for ${wt.practiceLink.mockTestName}, filtered to ${wt.topic}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 transition-all shrink-0"
              >
                {copiedTopic === wt.topic ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Practice Link
                  </>
                )}
              </button>
            ) : (
              <span
                title="Publish and share a mock test containing this topic to get a practice link here"
                className="text-xs text-muted-foreground shrink-0 italic"
              >
                No shared test covers this yet
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
