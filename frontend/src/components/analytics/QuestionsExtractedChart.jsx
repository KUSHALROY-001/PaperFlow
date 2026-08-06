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

export default function QuestionsExtractedChart({ monthlyData }) {
  return (
    <div className="surface-card rounded-2xl p-5 border border-border">
      <h3 className="font-bold text-foreground mb-1">
        Questions Extracted
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Monthly extraction volume
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={monthlyData} barSize={20}>
          <CartesianGrid strokeDasharray="3 3" stroke="#24242a" opacity={0.3} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="questions"
            name="Questions"
            fill="url(#orangeGrad)"
            radius={[6, 6, 0, 0]}
          />
          <defs>
            <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
