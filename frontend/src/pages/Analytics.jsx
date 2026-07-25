import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  FileText,
  CheckCircle,
  Zap,
  BarChart2,
  Star,
} from "lucide-react";

const monthlyData = [
  { month: "Dec", clusters: 3, questions: 180, confidence: 82 },
  { month: "Jan", clusters: 5, questions: 310, confidence: 85 },
  { month: "Feb", clusters: 4, questions: 260, confidence: 87 },
  { month: "Mar", clusters: 7, questions: 450, confidence: 88 },
  { month: "Apr", clusters: 9, questions: 620, confidence: 91 },
  { month: "May", clusters: 6, questions: 410, confidence: 93 },
];

const topicData = [
  { topic: "Data Structures", count: 145, avg_confidence: 91 },
  { topic: "Algorithms", count: 128, avg_confidence: 88 },
  { topic: "Networking", count: 97, avg_confidence: 84 },
  { topic: "OOP", count: 82, avg_confidence: 79 },
  { topic: "Databases", count: 74, avg_confidence: 90 },
  { topic: "OS", count: 63, avg_confidence: 85 },
];

const statusData = [
  { name: "Approved", value: 73, color: "#10B981" },
  { name: "Needs Review", value: 18, color: "#F59E0B" },
  { name: "Flagged", value: 9, color: "#EF4444" },
];

const recentClusters = [
  {
    name: "JECA 2024 Full Paper",
    questions: 78,
    confidence: 94,
    status: "completed",
    time: "1h 12m",
  },
  {
    name: "GATE CS 2023",
    questions: 65,
    confidence: 89,
    status: "completed",
    time: "58m",
  },
  {
    name: "Data Structures PYQ",
    questions: 42,
    confidence: 96,
    status: "completed",
    time: "34m",
  },
  {
    name: "Networking Notes",
    questions: 31,
    confidence: 81,
    status: "completed",
    time: "28m",
  },
  {
    name: "Algorithms Mock",
    questions: 50,
    confidence: 92,
    status: "completed",
    time: "41m",
  },
];

const COLORS = ["#10B981", "#F59E0B", "#EF4444"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-2xl p-3 shadow-lg text-xs">
        <p className="font-bold text-foreground mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Analytics</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Cross-cluster insights into your extraction pipeline performance.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Clusters",
            value: "34",
            delta: "+6 this month",
            icon: FileText,
            color: "bg-orange-500/15 text-orange-500 border border-orange-500/20",
          },
          {
            label: "Questions Extracted",
            value: "2,230",
            delta: "+410 this month",
            icon: CheckCircle,
            color: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20",
          },
          {
            label: "Avg. Confidence",
            value: "91%",
            delta: "+2% vs last month",
            icon: Star,
            color: "bg-amber-500/15 text-amber-500 border border-amber-500/20",
          },
          {
            label: "Avg. Processing Time",
            value: "45m",
            delta: "-8m improvement",
            icon: Zap,
            color: "bg-blue-500/15 text-blue-500 border border-blue-500/20",
          },
        ].map((s, i) => (
          <div key={i} className="surface-card rounded-2xl p-4 border border-border hover:border-orange-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center`}
              >
                <s.icon className="w-4 h-4" />
              </div>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5 font-medium">
              {s.label}
            </div>
            <div className="text-xs text-emerald-500 font-semibold mt-1">
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Questions extracted over time */}
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

        {/* Confidence over time */}
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
      </div>

      {/* Charts row 2 */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Topic breakdown */}
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

        {/* Question status pie */}
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
      </div>

      {/* Recent cluster performance */}
      <div className="surface-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">
            Recent Cluster Performance
          </h3>
        </div>
        <div className="divide-y divide-border">
          {recentClusters.map((c, i) => (
            <div key={i} className="px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 hover:bg-muted/40 transition-colors">
              <div className="w-8 h-8 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {c.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.questions} questions · {c.time} to process
                </p>
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-bold ${c.confidence >= 90 ? "text-emerald-500" : c.confidence >= 80 ? "text-amber-500" : "text-red-500"}`}
                >
                  {c.confidence}%
                </div>
                <div className="text-xs text-muted-foreground font-medium">confidence</div>
              </div>
              <div className="w-full sm:w-24 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${c.confidence}%`,
                    background:
                      c.confidence >= 90
                        ? "#10B981"
                        : c.confidence >= 80
                          ? "#F59E0B"
                          : "#EF4444",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
