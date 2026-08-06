import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Filter,
  Play,
  RotateCcw,
  Zap,
} from "lucide-react";
import { formatDate } from "@/lib/date";
import PhaseWaterCard from "./PhaseWaterCard";

// Promoted from an inline function inside pages/MockTestWorkspace.jsx — no behavior changes.
export default function OverviewTab({
  mocktest,
  questions,
  latestJob,
  clusterId,
  setActiveTab,
  onReprocess,
}) {
  const [showAllTopics, setShowAllTopics] = useState(false);
  const isProcessing =
    mocktest.status === "processing" ||
    ["queued", "running"].includes(latestJob?.status);
  const isReady =
    questions.length > 0 ||
    mocktest.status === "published" ||
    mocktest.status === "review";
  const topics = [
    ...new Set(questions.map((question) => question.topic).filter(Boolean)),
  ].sort();
  const currentStage =
    latestJob?.current_stage ||
    (isReady ? "Questions available" : "Waiting for PDF upload");
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
        <div className="surface-card rounded-2xl border border-border p-4 sm:p-6">
          <h3 className="font-bold text-foreground mb-4">Pipeline Status</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <PhaseWaterCard
              phaseTitle="Phase 1: Upload & AI Extraction"
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
              onClick={onReprocess}
              disabled={isProcessing}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4 text-orange-500" /> Reprocess
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
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-orange-500" /> Topic-wise Practice
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {topics.map((topic, index) => {
                const isHiddenOnMobile = !showAllTopics && index >= 2;
                return (
                  <Link
                    key={topic}
                    to={`/session/${mocktest.id}?topic=${encodeURIComponent(topic)}`}
                    className={`items-center gap-2 px-3.5 py-2.5 border border-border bg-card text-foreground font-medium rounded-xl hover:border-orange-500/40 hover:bg-muted transition-colors text-xs sm:text-sm truncate ${
                      isHiddenOnMobile ? "hidden sm:flex" : "flex"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 text-orange-500 shrink-0" />{" "}
                    {topic}
                  </Link>
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
