import { CheckCircle, Star } from "lucide-react";

export default function PlansSection({
  billing,
  setBilling,
  plans,
  upgrading,
  handleUpgrade,
}) {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="font-extrabold text-foreground tracking-tight">Plans</h2>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border">
          {["monthly", "yearly"].map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                billing === b
                  ? "bg-orange-500/10 text-orange-500 dark:bg-orange-500/15 font-bold border border-orange-500/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {b}{" "}
              {b === "yearly" && (
                <span className="text-emerald-500 ml-0.5">-20%</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`surface-card rounded-2xl p-5 border-2 transition-all ${plan.current ? "border-orange-500/50 shadow-lg shadow-orange-500/10" : "border-border hover:border-orange-500/30"}`}
          >
            {plan.badge && (
              <div
                className={`text-xs font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 mb-3 ${plan.current ? "bg-orange-500/15 text-orange-500 border border-orange-500/20" : "bg-amber-500/15 text-amber-500 border border-amber-500/20"}`}
              >
                <Star className="w-3 h-3" /> {plan.badge}
              </div>
            )}
            <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {plan.description}
            </p>
            <div className="mb-4">
              <span className="text-3xl font-extrabold text-foreground tracking-tight">
                $
                {billing === "yearly"
                  ? Math.round(plan.price * 0.8)
                  : plan.price}
              </span>
              {plan.price > 0 && (
                <span className="text-muted-foreground text-sm font-medium">
                  /{plan.period}
                </span>
              )}
            </div>
            <div className="space-y-2 mb-5">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-foreground font-medium">{f}</span>
                </div>
              ))}
            </div>
            {plan.current ? (
              <button
                disabled
                className="w-full py-2.5 bg-orange-500/15 text-orange-500 border border-orange-500/20 font-bold rounded-xl text-xs sm:text-sm opacity-90"
              >
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleUpgrade(plan.id)}
                className={`w-full py-2.5 font-bold rounded-xl text-xs sm:text-sm transition-all ${upgrading === plan.id ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : plan.id === "team" ? "bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs" : "bg-card border border-border text-foreground hover:bg-muted"}`}
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
  );
}
