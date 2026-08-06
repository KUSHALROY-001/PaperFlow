import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import CustomTooltip from "./CustomTooltip";

export default function QuestionsByTopicChart({ topicData }) {
  return (
    <div className="surface-card rounded-2xl p-5 border border-border md:col-span-2">
      <h3 className="font-bold text-foreground mb-1">Questions by Topic</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Most extracted topics across all clusters
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={topicData} layout="vertical" barSize={16}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#24242a"
            opacity={0.3}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="topic"
            type="category"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            name="Questions"
            fill="#ea580c"
            radius={[0, 6, 6, 0]}
            opacity={0.9}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
