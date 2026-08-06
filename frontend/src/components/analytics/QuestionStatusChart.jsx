import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export default function QuestionStatusChart({ statusData, COLORS }) {
  return (
    <div className="surface-card rounded-2xl p-5 border border-border">
      <h3 className="font-bold text-foreground mb-1">Question Status</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Overall review breakdown
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={statusData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={3}
            dataKey="value"
          >
            {statusData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip formatter={(val) => `${val}%`} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5 mt-2">
        {statusData.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: COLORS[i] }}
              />
              <span className="text-muted-foreground">{s.name}</span>
            </div>
            <span className="font-bold text-foreground">{s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
