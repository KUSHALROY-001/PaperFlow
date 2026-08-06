import { useState } from "react";

export const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    description: "Perfect for trying MockCraft",
    features: [
      "5 clusters / month",
      "50 pages per cluster",
      "Basic OCR correction",
      "JSON export",
      "Community support",
    ],
    limits: { clusters: 5, pages: 50 },
    color: "border-border",
    current: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 12,
    period: "month",
    description: "For students and educators",
    features: [
      "50 clusters / month",
      "500 pages per cluster",
      "Advanced OCR + correction",
      "Question editor",
      "Templates library",
      "Batch upload",
      "Priority support",
    ],
    limits: { clusters: 50, pages: 500 },
    color: "border-orange-500",
    current: true,
    badge: "Current Plan",
  },
  {
    id: "team",
    name: "Team",
    price: 39,
    period: "month",
    description: "For coaching institutes & teams",
    features: [
      "Unlimited clusters",
      "Unlimited pages",
      "All Pro features",
      "Team management (up to 10)",
      "Analytics dashboard",
      "API access",
      "Dedicated support",
    ],
    limits: { clusters: null, pages: null },
    color: "border-border",
    current: false,
    badge: "Most Popular",
  },
];

export const invoices = [
  {
    id: "INV-2024-005",
    date: "May 1, 2026",
    amount: 12,
    status: "Paid",
    plan: "Pro Monthly",
  },
  {
    id: "INV-2024-004",
    date: "Apr 1, 2026",
    amount: 12,
    status: "Paid",
    plan: "Pro Monthly",
  },
  {
    id: "INV-2024-003",
    date: "Mar 1, 2026",
    amount: 12,
    status: "Paid",
    plan: "Pro Monthly",
  },
  {
    id: "INV-2024-002",
    date: "Feb 1, 2026",
    amount: 12,
    status: "Paid",
    plan: "Pro Monthly",
  },
];

export function useBilling() {
  const [billing, setBilling] = useState("monthly");
  const [upgrading, setUpgrading] = useState(null);

  const handleUpgrade = (planId) => {
    setUpgrading(planId);
    setTimeout(() => setUpgrading(null), 2000);
  };

  const usage = {
    clusters: 18,
    clustersLimit: 50,
    pages: 1240,
    pagesLimit: 500 * 50,
    questions: 2230,
  };

  return {
    billing,
    setBilling,
    upgrading,
    handleUpgrade,
    usage,
    plans,
    invoices,
  };
}
