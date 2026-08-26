import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, FileText } from "lucide-react";
import { formatTimeAgo } from "@/lib/date";
import { Skeleton } from "@/components/ui/skeleton";
import { clusterMockTestStatusConfig } from "@/utils/clusterHelpers";
import { Link } from "react-router-dom";

export default function RecentMockTestsList({ mockTests, isLoading }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          Recent Mock Tests
        </h2>
        <Link
          to="/clusters"
          className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="surface-card rounded-2xl p-4 sm:p-5 border border-border space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Skeleton className="w-5 h-5 rounded shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full shrink-0" />
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
            </div>
          ))
        ) : mockTests.length === 0 ? (
          <div className="surface-card rounded-2xl border border-border p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No mock tests yet</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Create a cluster and upload a PDF to get started.
            </p>
            <Link
              to="/clusters"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#ea580c] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#c2410c]"
            >
              Go to Clusters
            </Link>
          </div>
        ) : (
          mockTests.map((mockTest) => {
            const status =
              clusterMockTestStatusConfig[mockTest.status] ||
              clusterMockTestStatusConfig.draft;
            const isProcessing = mockTest.status === "processing";

            return (
              <div
                key={mockTest.id}
                onClick={() =>
                  navigate(`/cluster/${mockTest.cluster_id}/mocktest/${mockTest.id}`)
                }
                className="group surface-card rounded-2xl p-4 sm:p-5 border border-border hover:border-orange-500/40 cursor-pointer transition-all space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="text-orange-500 mt-0.5 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground group-hover:text-orange-500 transition-colors truncate">
                        {mockTest.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {mockTest.cluster_name}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                      isProcessing
                        ? "animate-pulse bg-orange-500/15 text-orange-500 border border-orange-500/40"
                        : status.color
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isProcessing ? "bg-orange-500 animate-ping" : status.dot
                      }`}
                    />
                    {status.label}
                  </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimeAgo(mockTest.updated_at)}
                    </span>
                    {Number(mockTest.total_questions) > 0 && (
                      <span className="px-2 py-0.5 bg-purple-500/15 text-purple-400 dark:text-purple-300 font-semibold rounded-lg">
                        {mockTest.total_questions} Q
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 px-3 py-1.5 font-semibold text-orange-500 border border-orange-500/30 group-hover:bg-orange-500/10 rounded-md transition-colors">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
