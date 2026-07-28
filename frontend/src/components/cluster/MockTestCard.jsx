import { Link } from "react-router-dom";
import { ArrowRight, Clock, FileText } from "lucide-react";
import { formatTimeAgo } from "@/lib/date";
import { clusterMockTestStatusConfig } from "@/utils/clusterHelpers";

// Promoted from an inline .map() render inside pages/ClusterWorkspace.jsx — no behavior changes.
export default function MockTestCard({ mocktest, clusterId }) {
  const status =
    clusterMockTestStatusConfig[mocktest.status] ||
    clusterMockTestStatusConfig.draft;
  const isProcessing = mocktest.status === "processing";

  return (
    <div className="surface-card rounded-2xl p-5 border border-border hover:border-orange-500/30 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>
        <h3 className="font-bold text-foreground mb-1 truncate text-base">
          {mocktest.name}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <FileText className="w-3.5 h-3.5" />
          <span className="truncate">
            {mocktest.description || "Manual mock test"}
          </span>
        </div>
        <div className="flex gap-2 mb-3 flex-wrap">
          {mocktest.exam_year && (
            <span className="text-xs bg-orange-500/10 text-orange-500 font-semibold px-2 py-0.5 rounded-lg border border-orange-500/20">
              {mocktest.exam_year}
            </span>
          )}
          {Number(mocktest.total_questions) > 0 && (
            <span className="text-xs bg-purple-500/15 text-purple-400 dark:text-purple-300 font-semibold px-2 py-0.5 rounded-lg">
              {mocktest.total_questions} Q
            </span>
          )}
        </div>
        {isProcessing && (
          <div className="mb-3">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-500 animate-pulse"
                style={{ width: "60%" }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {formatTimeAgo(mocktest.created_at)}
        </span>
        <Link
          to={`/cluster/${clusterId}/mocktest/${mocktest.id}`}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-500 border border-orange-500/30 hover:bg-orange-500/10 rounded-lg transition-colors"
        >
          Open <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
