import { Clock, Shield, User } from "lucide-react";

// Extracted from pages/Team.jsx — no behavior changes.
export default function TeamStatsRow({ members, invites }) {
  const stats = [
    {
      label: "Total Members",
      value: members.length,
      icon: User,
      color: "bg-orange-500/15 text-orange-500 border border-orange-500/20",
    },
    {
      label: "Pending Invites",
      value: invites.length,
      icon: Clock,
      color: "bg-amber-500/15 text-amber-500 border border-amber-500/20",
    },
    {
      label: "Admins",
      value: members.filter((m) => m.role === "admin" || m.role === "owner")
        .length,
      icon: Shield,
      color: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((s, i) => (
        <div
          key={i}
          className="surface-card rounded-2xl p-4 border border-border flex items-center gap-3"
        >
          <div
            className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center`}
          >
            <s.icon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-foreground tracking-tight">
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
