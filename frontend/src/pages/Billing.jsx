import { useState } from "react";
import {
  CheckCircle,
  Zap,
  FileText,
  Download,
  CreditCard,
  Star,
} from "lucide-react";

const plans = [
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
    color: "border-violet-500",
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

const invoices = [
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

export default function Billing() {
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

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription and usage.
        </p>
      </div>

      {/* Current usage */}
      <div className="card-lavender rounded-2xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h2 className="font-bold text-foreground">Current Usage</h2>
            <p className="text-xs text-muted-foreground">
              Pro Plan · Resets Jun 1, 2026
            </p>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> Pro Plan Active
          </span>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              label: "Clusters Used",
              used: usage.clusters,
              limit: 50,
              unit: "clusters",
              icon: FileText,
              color: "#7C3AED",
            },
            {
              label: "Pages Processed",
              used: usage.pages,
              limit: 25000,
              unit: "pages",
              icon: Zap,
              color: "#4F46E5",
            },
            {
              label: "Questions Extracted",
              used: usage.questions,
              limit: null,
              unit: "total",
              icon: CheckCircle,
              color: "#10B981",
            },
          ].map((u, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold text-foreground">{u.label}</span>
                <span className="text-muted-foreground">
                  {u.used.toLocaleString()}
                  {u.limit ? ` / ${u.limit.toLocaleString()}` : ""}
                </span>
              </div>
              {u.limit ? (
                <div className="h-2.5 bg-violet-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((u.used / u.limit) * 100, 100)}%`,
                      background: u.color,
                    }}
                  />
                </div>
              ) : (
                <div className="h-2.5 bg-emerald-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: "100%" }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {u.limit
                  ? `${Math.round((u.used / u.limit) * 100)}% used`
                  : "Unlimited"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="font-bold text-foreground">Plans</h2>
          <div className="flex items-center gap-1 bg-violet-100 p-1 rounded-xl">
            {["monthly", "yearly"].map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${billing === b ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {b}{" "}
                {b === "yearly" && (
                  <span className="text-emerald-600 ml-0.5">-20%</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`card-lavender rounded-2xl p-5 border-2 transition-all ${plan.current ? "border-violet-500 shadow-lg shadow-violet-100" : "border-border hover:border-violet-300"}`}
            >
              {plan.badge && (
                <div
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 mb-3 ${plan.current ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}`}
                >
                  <Star className="w-3 h-3" /> {plan.badge}
                </div>
              )}
              <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {plan.description}
              </p>
              <div className="mb-4">
                <span className="text-3xl font-black text-foreground">
                  $
                  {billing === "yearly"
                    ? Math.round(plan.price * 0.8)
                    : plan.price}
                </span>
                {plan.price > 0 && (
                  <span className="text-muted-foreground text-sm">
                    /{plan.period}
                  </span>
                )}
              </div>
              <div className="space-y-2 mb-5">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-foreground">{f}</span>
                  </div>
                ))}
              </div>
              {plan.current ? (
                <button
                  disabled
                  className="w-full py-2.5 bg-violet-100 text-violet-700 font-semibold rounded-xl text-sm opacity-75"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  className={`w-full py-2.5 font-semibold rounded-xl text-sm transition-all ${upgrading === plan.id ? "bg-emerald-100 text-emerald-700" : plan.id === "team" ? "gradient-violet text-white shadow-md shadow-violet-200 hover:opacity-90" : "bg-card border border-border text-violet-700 hover:bg-violet-50"}`}
                >
                  {upgrading === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Upgrading...
                    </span>
                  ) : plan.id === "free" ? (
                    "Downgrade"
                  ) : (
                    "Upgrade"
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment method */}
      <div className="card-lavender rounded-2xl p-5">
        <h3 className="font-bold text-foreground mb-4">Payment Method</h3>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Visa ending in 4242
              </p>
              <p className="text-xs text-muted-foreground">Expires 12/27</p>
            </div>
          </div>
          <button className="text-xs font-semibold text-violet-600 hover:underline">
            Update
          </button>
        </div>
      </div>

      {/* Invoices */}
      <div className="card-lavender rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">Invoice History</h3>
        </div>
        <div className="divide-y divide-violet-50">
          {invoices.map((inv) => (
            <div key={inv.id} className="px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {inv.plan}
                </p>
                <p className="text-xs text-muted-foreground">
                  {inv.date} · {inv.id}
                </p>
              </div>
              <span className="text-sm font-bold text-foreground">
                ${inv.amount}
              </span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg font-semibold">
                {inv.status}
              </span>
              <button className="w-7 h-7 rounded-lg hover:bg-violet-100 flex items-center justify-center text-muted-foreground hover:text-violet-600 transition-colors">
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
