import { useState } from "react";
import {
  Mail,
  Shield,
  User,
  Trash2,
  Plus,
  Search,
  CheckCircle,
  Clock,
  MoreVertical,
} from "lucide-react";

const roles = ["Admin", "Reviewer", "Viewer"];
const roleColors = {
  Admin: "bg-orange-500/10 text-orange-500 border border-orange-500/20",
  Reviewer: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  Viewer: "bg-muted text-muted-foreground border border-border",
};

const initialMembers = [
  {
    id: 1,
    name: "Arjun Sharma",
    email: "arjun@mockcraft.io",
    role: "Admin",
    avatar: "AS",
    status: "active",
    joined: "Jan 2024",
    clusters: 12,
  },
  {
    id: 2,
    name: "Priya Mehta",
    email: "priya@mockcraft.io",
    role: "Reviewer",
    avatar: "PM",
    status: "active",
    joined: "Feb 2024",
    clusters: 8,
  },
  {
    id: 3,
    name: "Rahul Gupta",
    email: "rahul@mockcraft.io",
    role: "Reviewer",
    avatar: "RG",
    status: "active",
    joined: "Mar 2024",
    clusters: 5,
  },
  {
    id: 4,
    name: "Sneha Verma",
    email: "sneha@mockcraft.io",
    role: "Viewer",
    avatar: "SV",
    status: "active",
    joined: "Apr 2024",
    clusters: 2,
  },
];

const invites = [
  {
    id: 5,
    email: "tanvi@example.com",
    role: "Reviewer",
    status: "pending",
    sentAt: "2 days ago",
  },
  {
    id: 6,
    email: "ravi.k@example.com",
    role: "Viewer",
    status: "pending",
    sentAt: "5 days ago",
  },
];

const avatarColors = [
  "bg-orange-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
];

export default function Team() {
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Reviewer");
  const [inviteSent, setInviteSent] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleChangeRole = (id, role) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
    setOpenMenu(null);
  };

  const handleRemove = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setOpenMenu(null);
  };

  const handleInvite = (e) => {
    e.preventDefault();
    setInviteSent(true);
    setTimeout(() => {
      setInviteSent(false);
      setShowInviteModal(false);
      setInviteEmail("");
    }, 1800);
  };

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Team</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage who has access to your MockCraft workspace.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl shadow-xs transition-all text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
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
            value: members.filter((m) => m.role === "Admin").length,
            icon: Shield,
            color: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20",
          },
        ].map((s, i) => (
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
              <div className="text-xl font-extrabold text-foreground tracking-tight">{s.value}</div>
              <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all text-xs sm:text-sm"
        />
      </div>

      {/* Members table */}
      <div className="surface-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center">
          <span className="text-sm font-bold text-foreground">
            Active Members
          </span>
          <span className="ml-2 text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">
            {members.length}
          </span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((m, i) => (
            <div
              key={m.id}
              className="px-4 sm:px-6 py-4 flex flex-wrap sm:flex-nowrap items-center gap-4 hover:bg-muted/40 transition-colors relative"
            >
              <div
                className={`w-10 h-10 rounded-xl ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}
              >
                {m.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-foreground">
                  {m.name}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {m.email}
                </div>
              </div>
              <div className="text-xs text-muted-foreground hidden sm:block font-medium">
                {m.clusters} clusters
              </div>
              <div className="text-xs text-muted-foreground hidden sm:block font-medium">
                Joined {m.joined}
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${roleColors[m.role]}`}
              >
                {m.role}
              </span>
              <div className="relative ml-auto">
                <button
                  onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                  className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {openMenu === m.id && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-card rounded-2xl shadow-xl border border-border p-2 z-20">
                    <div className="text-[11px] font-bold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                      Change Role
                    </div>
                    {roles.map((r) => (
                      <button
                        key={r}
                        onClick={() => handleChangeRole(m.id, r)}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors ${m.role === r ? "bg-orange-500/15 text-orange-500 font-bold" : "hover:bg-muted text-foreground"}`}
                      >
                        {m.role === r && (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        {r}
                      </button>
                    ))}
                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        onClick={() => handleRemove(m.id)}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="surface-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center">
            <span className="text-sm font-bold text-foreground">
              Pending Invites
            </span>
            <span className="ml-2 text-xs bg-amber-500/15 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
              {invites.length}
            </span>
          </div>
          <div className="divide-y divide-border">
            {invites.map((inv) => (
              <div key={inv.id} className="px-4 sm:px-6 py-4 flex flex-wrap sm:flex-nowrap items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-foreground">
                    {inv.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Sent {inv.sentAt}
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${roleColors[inv.role]}`}
                >
                  {inv.role}
                </span>
                <span className="text-xs bg-amber-500/15 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md surface-card border border-border rounded-3xl shadow-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-1">
              Invite Team Member
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-5">
              They'll receive an email to join your workspace.
            </p>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
                >
                  {roles.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-muted-foreground bg-muted border border-border rounded-xl p-3">
                <strong className="text-orange-500">Role permissions:</strong>{" "}
                Admin (full access) · Reviewer (edit clusters, review questions)
                · Viewer (read-only)
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2.5 border border-border bg-card text-foreground font-semibold rounded-xl hover:bg-muted text-xs sm:text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 font-semibold rounded-xl text-xs sm:text-sm transition-all ${inviteSent ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs"}`}
                >
                  {inviteSent ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Invite Sent!
                    </span>
                  ) : (
                    "Send Invite"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
