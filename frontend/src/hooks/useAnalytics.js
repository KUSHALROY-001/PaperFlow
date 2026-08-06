import { FileText, CheckCircle, Star, Zap } from "lucide-react";

export const monthlyData = [
  { month: "Dec", clusters: 3, questions: 180, confidence: 82 },
  { month: "Jan", clusters: 5, questions: 310, confidence: 85 },
  { month: "Feb", clusters: 4, questions: 260, confidence: 87 },
  { month: "Mar", clusters: 7, questions: 450, confidence: 88 },
  { month: "Apr", clusters: 9, questions: 620, confidence: 91 },
  { month: "May", clusters: 6, questions: 410, confidence: 93 },
];

export const topicData = [
  { topic: "Data Structures", count: 145, avg_confidence: 91 },
  { topic: "Algorithms", count: 128, avg_confidence: 88 },
  { topic: "Networking", count: 97, avg_confidence: 84 },
  { topic: "OOP", count: 82, avg_confidence: 79 },
  { topic: "Databases", count: 74, avg_confidence: 90 },
  { topic: "OS", count: 63, avg_confidence: 85 },
];

export const statusData = [
  { name: "Approved", value: 73, color: "#10B981" },
  { name: "Needs Review", value: 18, color: "#F59E0B" },
  { name: "Flagged", value: 9, color: "#EF4444" },
];

export const recentClusters = [
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

export const COLORS = ["#10B981", "#F59E0B", "#EF4444"];

export function useAnalytics() {
  const summaryStats = [
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
  ];

  return {
    monthlyData,
    topicData,
    statusData,
    recentClusters,
    COLORS,
    summaryStats,
  };
}
