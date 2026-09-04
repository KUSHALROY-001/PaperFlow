import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Filter,
  Play,
  RotateCcw,
  Square,
  Zap,
} from "lucide-react";
import { formatDate } from "@/lib/date";
import PhaseWaterCard from "./PhaseWaterCard";
import UploadPdfPanel from "./UploadPdfPanel";

// Promoted from an inline function inside pages/MockTestWorkspace.jsx — no behavior changes.
export default function OverviewTab({
  mocktest,
  questions,
  latestJob,
  clusterId,
  setActiveTab,
  onReprocess,
  onCancelProcessing,
  onUpload,
  isViewer,
}) {
  const navigate = useNavigate();
  const [showAllTopics, setShowAllTopics] = useState(false);
  // Which topics are currently toggled on in the multi-select below - a
  // Set rather than an array since membership checks (is this topic
  // selected?) happen on every render of every chip.
  const [selectedTopics, setSelectedTopics] = useState(new Set());
  const isProcessing =
    mocktest.status === "processing" ||
    ["queued", "running"].includes(latestJob?.status);
  const isReady =
    questions.length > 0 ||
    mocktest.status === "published" ||
    mocktest.status === "review";
  // A template-created mock test starts in "draft" with no job ever queued -
  // that combination is the real "nothing uploaded yet" signal (as opposed
  // to a fresh 404-avoided in-between state), distinct from isProcessing
  // and isReady above.
  const needsFirstUpload = !latestJob && mocktest.status === "draft";
  const topicCounts = questions.reduce((map, question) => {
    const topic = question.topic?.trim();
    if (!topic) return map;
    map.set(topic, (map.get(topic) || 0) + 1);
    return map;
  }, new Map());
  const topics = [...topicCounts.keys()].sort((a, b) => a.localeCompare(b));

  const toggleTopic = (topic) => {
    setSelectedTopics((current) => {
      const next = new Set(current);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const selectedTopicsCount = selectedTopics.size;
  const selectedQuestionsCount = [...selectedTopics].reduce(
    (sum, topic) => sum + (topicCounts.get(topic) || 0),
    0,
  );

  const startTopicPractice = () => {
    if (selectedTopicsCount === 0) return;
    const query = [...selectedTopics]
      .map((topic) => `topics=${encodeURIComponent(topic)}`)
      .join("&");
    navigate(`/session/${mocktest.id}?${query}`);
  };
  const isGenerated =
    latestJob?.input_config?.documentType === "generate_from_existing";
  const currentStage =
    latestJob?.current_stage ||
    (isReady
      ? "Questions available"
      : isGenerated
        ? "Waiting for generation to start"
        : "Waiting for PDF upload");
  const progress = Number(latestJob?.progress_percent || 0);

  const phase1FillLevel = isReady
    ? 100
    : isProcessing
      ? Math.max(progress || 68, 20)
      : 0;
  const phase1Tone = isReady ? "emerald" : isProcessing ? "orange" : "neutral";

  const phase2FillLevel = isReady ? 100 : 0;
  const phase2Tone = isReady ? "emerald" : "neutral";

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {needsFirstUpload && (
          <UploadPdfPanel
            mocktest={mocktest}
            isViewer={isViewer}
            onUpload={onUpload}
          />
        )}

        <div className="surface-card rounded-2xl border border-border p-4 sm:p-6">
          <h3 className="font-bold text-foreground mb-4">Pipeline Status</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <PhaseWaterCard
              phaseTitle={
                isGenerated
                  ? "Phase 1: AI Generation"
                  : "Phase 1: Upload & AI Extraction"
              }
              status={
                isProcessing ? "Running" : isReady ? "Completed" : "Not Started"
              }
              substep={
                isProcessing
                  ? `${currentStage} (${progress}%)`
                  : isReady
                    ? "Questions available"
                    : currentStage
              }
              icon={isProcessing ? Zap : CheckCircle}
              fillLevel={phase1FillLevel}
              fillTone={phase1Tone}
            />

            <PhaseWaterCard
              phaseTitle="Phase 2: Review & Export"
              status={isReady ? "Ready" : "Waiting"}
              substep={
                isReady
                  ? `${questions.length} questions to review`
                  : "Add questions first"
              }
              icon={CheckCircle}
              fillLevel={phase2FillLevel}
              fillTone={phase2Tone}
            />
          </div>
        </div>

        <div className="surface-card rounded-2xl border border-border p-4 sm:p-6">
          <h3 className="font-bold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              to={`/session/${mocktest.id}`}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
            >
              <Play className="w-4 h-4 text-emerald-500" /> Start Full Test
            </Link>
            <button
              onClick={() => setActiveTab("output")}
              disabled={!isReady}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl bg-[#ea580c] px-4 py-3 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#c2410c] disabled:opacity-40"
            >
              <Download className="w-4 h-4" /> Export JSON
            </button>
            <button
              onClick={() => setActiveTab("review")}
              disabled={!isReady}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-500/20 disabled:opacity-40 dark:text-amber-400"
            >
              <AlertCircle className="w-4 h-4 text-amber-500" /> Review
              Questions
            </button>
            <button
              onClick={isProcessing ? onCancelProcessing : onReprocess}
              disabled={isViewer}
              title={
                isViewer
                  ? "Editor role is required"
                  : isProcessing
                    ? "Cancel the current processing job"
                    : "Re-extract from the original PDF"
              }
              className={`flex min-h-12 w-full items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-40 ${
                isProcessing
                  ? "border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {isProcessing ? (
                <>
                  <Square className="w-4 h-4 fill-current" /> Cancel Processing
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 text-orange-500" /> Reprocess
                </>
              )}
            </button>
            <Link
              to={`/cluster/${clusterId}/mock/${mocktest.id}/editor`}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:col-span-2"
            >
              <FileText className="w-4 h-4 text-orange-500" /> Edit Questions
            </Link>
          </div>
        </div>

        {topics.length > 0 && (
          <div className="surface-card rounded-2xl p-4 sm:p-6 border border-border">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Filter className="w-4 h-4 text-orange-500" /> Topic-wise
                Practice
              </h3>
              {topics.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedTopics((current) =>
                      current.size === topics.length
                        ? new Set()
                        : new Set(topics),
                    )
                  }
                  className="text-xs font-semibold text-orange-500 hover:underline shrink-0"
                >
                  {selectedTopicsCount === topics.length
                    ? "Clear all"
                    : "Select all"}
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Select one or more topics, then start a practice session covering
              just those questions.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {topics.map((topic, index) => {
                const isHiddenOnMobile = !showAllTopics && index >= 2;
                const count = topicCounts.get(topic) || 0;
                const isSelected = selectedTopics.has(topic);
                return (
                  <button
                    type="button"
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    aria-pressed={isSelected}
                    className={`items-center justify-between gap-2 px-3.5 py-2.5 border font-medium rounded-xl transition-colors text-xs sm:text-sm ${
                      isHiddenOnMobile ? "hidden sm:flex" : "flex"
                    } ${
                      isSelected
                        ? "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                        : "border-border bg-card text-foreground hover:border-orange-500/40 hover:bg-muted"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isSelected
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-border"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </span>
                      <span className="truncate">{topic}</span>
                    </span>
                    <span
                      className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isSelected
                          ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                          : "bg-orange-500/10 text-orange-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            {topics.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllTopics((prev) => !prev)}
                className="mt-3 sm:hidden flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-orange-500/20 bg-orange-500/10 text-xs font-semibold text-orange-500 hover:bg-orange-500/20 transition-all"
              >
                {showAllTopics ? (
                  <>
                    See Less <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    See More ({topics.length - 2} more){" "}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={startTopicPractice}
              disabled={selectedTopicsCount === 0}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-orange-500"
            >
              <Play className="w-4 h-4" />
              {selectedTopicsCount === 0
                ? "Select topics to start"
                : `Start Practice — ${selectedTopicsCount} topic${selectedTopicsCount > 1 ? "s" : ""}, ${selectedQuestionsCount} question${selectedQuestionsCount > 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </div>

      <div className="surface-card rounded-2xl p-6 border border-border">
        <h3 className="font-bold text-foreground mb-4">Activity Log</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-orange-500" />
            <div>
              <span className="text-xs text-muted-foreground">
                {formatDate(mocktest.created_at)}
              </span>
              <p className="text-xs sm:text-sm font-medium text-foreground">
                Mock test created
              </p>
            </div>
          </div>
          {questions.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-emerald-500" />
              <div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(mocktest.updated_at)}
                </span>
                <p className="text-xs sm:text-sm font-medium text-foreground">
                  Questions saved: {questions.length}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
