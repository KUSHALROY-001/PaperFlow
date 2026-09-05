import { Link } from "react-router-dom";
import {
  Clock,
  FileText,
  Globe,
  Play,
  RotateCcw,
  Share2,
  Square,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/date";

export default function WorkspaceHeader({
  mocktest,
  isGenerated,
  generationSources = [],
  status,
  isProcessing,
  questionsCount = 0,
  clusterId,
  isViewer,
  actionError,
  onPublish,
  onShare,
  onReprocessOrCancel,
  onDelete,
}) {
  const publishDisabled =
    isViewer || questionsCount === 0 || mocktest.status === "processing";

  let publishTitle;
  if (isViewer) {
    publishTitle = "Editor role is required to publish";
  } else if (questionsCount === 0) {
    publishTitle = "Add or extract at least one question before publishing";
  } else if (mocktest.status === "processing") {
    publishTitle = "Wait for extraction to finish before publishing";
  } else {
    publishTitle = "Publish this mock test";
  }
  const publishClass = publishDisabled
    ? "border-border bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50"
    : "border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20";

  let reprocessClass;
  let reprocessTitle;
  if (isViewer) {
    reprocessClass =
      "border-border text-muted-foreground/30 cursor-not-allowed opacity-50";
    reprocessTitle = "Editor role is required to reprocess";
  } else if (isProcessing) {
    reprocessClass =
      "border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50";
    reprocessTitle = "Cancel the current processing job";
  } else {
    reprocessClass =
      "border-border text-muted-foreground hover:text-foreground hover:border-orange-500/40";
    reprocessTitle = "Re-extract from the original PDF";
  }

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              {mocktest.name}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}
            >
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />{" "}
              {isGenerated ? "AI-generated mock test" : "Manual mock test"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Created{" "}
              {formatDate(mocktest.created_at)}
            </span>
          </div>
          {isGenerated && generationSources.length > 0 && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Generated from:{" "}
              {generationSources.map((source, index) => (
                <span key={source.id}>
                  {index > 0 && ", "}
                  <Link
                    to={`/cluster/${clusterId}/mocktest/${source.id}`}
                    className="font-medium text-foreground hover:text-orange-500 hover:underline"
                  >
                    {source.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
          {mocktest.description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              {mocktest.description}
            </p>
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <Link
            to={`/session/${mocktest.id}`}
            className="flex flex-1 items-center justify-center gap-2 px-4 py-2 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold rounded-md hover:bg-emerald-500/20 transition-all text-xs sm:text-sm sm:flex-none"
          >
            <Play className="w-4 h-4 text-emerald-500" />
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start Test</span>
          </Link>
          {mocktest.status !== "published" && (
            <button
              disabled={publishDisabled}
              onClick={() => !isViewer && questionsCount > 0 && onPublish()}
              title={publishTitle}
              className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 border font-semibold rounded-md transition-all text-xs sm:text-sm sm:flex-none ${publishClass}`}
            >
              <Globe className="w-4 h-4" /> Publish
            </button>
          )}
          <button
            onClick={onShare}
            className="flex flex-1 items-center justify-center gap-2 px-4 py-2 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-semibold rounded-md hover:bg-orange-500/20 transition-all text-xs sm:text-sm sm:flex-none"
          >
            <Share2 className="w-4 h-4 text-orange-500" /> Share
          </button>
          <button
            disabled={isViewer}
            onClick={() => !isViewer && onReprocessOrCancel()}
            className={`w-9 h-9 rounded-3xl border flex items-center justify-center transition-all ${reprocessClass}`}
            title={reprocessTitle}
          >
            {isProcessing ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
          </button>
          <button
            disabled={isViewer}
            onClick={() => !isViewer && onDelete()}
            className={`w-9 h-9 rounded-3xl border flex items-center justify-center transition-all ${
              isViewer
                ? "border-red-500/10 text-red-500/30 cursor-not-allowed opacity-50"
                : "border-red-500/20 text-muted-foreground hover:text-red-500 hover:border-red-500/40"
            }`}
            title={
              isViewer
                ? "Editor role is required to delete mock test"
                : "Delete"
            }
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
          {actionError}
        </div>
      )}
    </>
  );
}
