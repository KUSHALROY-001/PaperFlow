import { useAnalytics } from "@/hooks/useAnalytics";
import AnalyticsHeader from "../components/analytics/AnalyticsHeader";
import AnalyticsSummaryRow from "../components/analytics/AnalyticsSummaryRow";
import QuestionsExtractedChart from "../components/analytics/QuestionsExtractedChart";
import ConfidenceTrendChart from "../components/analytics/ConfidenceTrendChart";
import QuestionsByTopicChart from "../components/analytics/QuestionsByTopicChart";
import QuestionStatusChart from "../components/analytics/QuestionStatusChart";
import RecentClusterPerformance from "../components/analytics/RecentClusterPerformance";

export default function Analytics() {
  const {
    monthlyData,
    topicData,
    statusData,
    recentClusters,
    COLORS,
    summaryStats,
  } = useAnalytics();

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-7xl mx-auto space-y-6">
      <AnalyticsHeader />
      <AnalyticsSummaryRow summaryStats={summaryStats} />

      {/* Charts row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        <QuestionsExtractedChart monthlyData={monthlyData} />
        <ConfidenceTrendChart monthlyData={monthlyData} />
      </div>

      {/* Charts row 2 */}
      <div className="grid md:grid-cols-3 gap-6">
        <QuestionsByTopicChart topicData={topicData} />
        <QuestionStatusChart statusData={statusData} COLORS={COLORS} />
      </div>

      <RecentClusterPerformance recentClusters={recentClusters} />
    </div>
  );
}
