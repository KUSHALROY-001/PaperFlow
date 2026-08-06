import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import CustomTooltip from "./CustomTooltip";

export default function ConfidenceTrendChart({ monthlyData }) {
  return (
    <div className="surface-card rounded-2xl p-5 border border-border">
      <h3 className="font-bold text-foreground mb-1">
        Avg. Confidence Score
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Extraction accuracy trend
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#24242a" opacity={0.3} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[75, 100]}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="confidence"
            name="Confidence %"
            stroke="#ea580c"
            strokeWidth={3}
            dot={{ fill: "#ea580c", r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
