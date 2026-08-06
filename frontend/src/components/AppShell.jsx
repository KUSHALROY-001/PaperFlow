import { useEffect, useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  FolderOpen,
  Zap,
  Settings,
  Plus,
  ChevronRight,
  Bell,
  Search,
  User,
  LogOut,
  BarChart2,
  Users,
  UserPlus,
  Upload,
  Puzzle,
  CreditCard,
  Library,
  ClipboardList,
  Menu,
  X,
} from "lucide-react";
import CreateClusterModal from "./CreateClusterModal";
import ThemeToggle from "./ThemeToggle";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import { useAuth } from "@/lib/AuthContext";

const navSections = [
  {
    label: null,
    items: [
      { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
      { icon: FolderOpen, label: "Clusters", to: "/clusters" },
      { icon: Zap, label: "Active Jobs", to: "/jobs" },
    ],
  },
  {
    label: "Tools",
    items: [
      { icon: Library, label: "Templates", to: "/templates" },
      { icon: Upload, label: "Batch Upload", to: "/batch" },
      { icon: BarChart2, label: "Analytics", to: "/analytics" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { icon: Users, label: "Team", to: "/team" },
      { icon: UserPlus, label: "Invitations", to: "/invitations" },
      { icon: Puzzle, label: "Integrations", to: "/integrations" },
      { icon: CreditCard, label: "Billing", to: "/billing" },
      { icon: Settings, label: "Settings", to: "/settings" },
    ],
  },
];

const roleLabels = {
  owner: "Owner",
  admin: "an Admin",
  editor: "an Editor",
  viewer: "a Viewer",
};

function roleLabelFor(role) {
  return roleLabels[role] || role;
}

function MockCraftLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center text-[#ea580c] shrink-0">
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className="text-xl font-extrabold text-foreground tracking-tight">
        MockCraft
      </span>
    </div>
  );
}

function SidebarContent({ location, onNavigate, onCreateCluster }) {
  return (
    <>
      <div className="p-5 border-b border-border">
        <Link to="/" onClick={onNavigate}>
          <MockCraftLogo />
        </Link>
      </div>

      <nav className="flex-1 p-3.5 space-y-4 overflow-y-auto scrollbar-hidden">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3.5 mb-1.5">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  location.pathname === item.to ||
                  (item.to === "/clusters" &&
                    location.pathname.startsWith("/cluster/"));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-orange-500/10 text-orange-500 dark:bg-orange-500/15 dark:text-orange-500 font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon
                      className={`w-4 h-4 ${active ? "text-orange-500" : ""}`}
                    />
                    {item.label}
                    {active && (
                      <ChevronRight className="w-3.5 h-3.5 ml-auto text-orange-500" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Invite team card */}
        <div className="pt-2">
          <div className="surface-card rounded-2xl p-4 border border-border space-y-3">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-500">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">
                Invite your team
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                Collaborate and manage mock tests together.
              </p>
            </div>
            <Link
              to="/team"
              onClick={onNavigate}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-orange-500/30 text-orange-500 font-semibold text-xs rounded-xl hover:bg-orange-500/10 transition-colors"
            >
              <Users className="w-3.5 h-3.5" /> Invite Team
            </Link>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={onCreateCluster}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl shadow-sm transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> New Cluster
        </button>
      </div>
    </>
  );
}

export default function AppShell() {
  const location = useLocation();
  const { logout, user, workspaceId, workspaces } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { data: myInvitationsData } = useQuery({
    queryKey: ["my-invitations"],
    queryFn: api.listMyInvitations,
    refetchInterval: 60_000,
  });
  const pendingInviteCount = myInvitationsData?.invitations?.length || 0;

  useEffect(() => {
    setMobileNavOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  const openClusterModal = () => {
    setMobileNavOpen(false);
    setShowModal(true);
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "K";
  const userName = user?.name ? user.name.split(" ")[0] : "Kushal";
  const currentWorkspace = workspaces.find((w) => w.id === workspaceId);
  const isGuestWorkspace = Boolean(
    currentWorkspace && !currentWorkspace.isOwner,
  );

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-55 bg-card border-r border-border flex-col fixed h-full z-40">
        <SidebarContent
          location={location}
          onNavigate={() => {}}
          onCreateCluster={openClusterModal}
        />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-[min(20rem,86vw)] flex-col bg-card border-r border-border shadow-2xl">
            <div className="absolute right-3 top-3">
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileNavOpen(false)}
                className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarContent
              location={location}
              onNavigate={() => setMobileNavOpen(false)}
              onCreateCluster={openClusterModal}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="min-h-screen flex flex-col lg:ml-55">
        {/* Top bar */}
        <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-30">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
            className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground lg:hidden shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Header Search */}
          <div className="hidden sm:block flex-1 max-w-md">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search clusters, mocks, templates..."
                className="w-full pl-9 pr-12 py-2 text-xs sm:text-sm rounded-xl border border-border bg-muted/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all text-foreground placeholder:text-muted-foreground"
              />
              <kbd className="absolute right-3 hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-card rounded border border-border">
                ⌘ K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <Link
              to="/my-results"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                location.pathname === "/my-results"
                  ? "bg-muted border-border text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <span className="hidden sm:inline">My Results</span>
            </Link>
            <ThemeToggle />
            <WorkspaceSwitcher />
            <Link
              to="/invitations"
              className="relative w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
            >
              <Bell className="w-4 h-4" />
              {pendingInviteCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingInviteCount > 9 ? "9+" : pendingInviteCount}
                </span>
              )}
            </Link>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-[#ea580c] text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {userInitial}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-foreground">
                  {userName}
                </span>
                <ChevronRight className="w-3 h-3 text-muted-foreground rotate-90 hidden sm:inline" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 surface-card rounded-2xl p-2 shadow-xl border border-border z-50">
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all w-full text-left"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {isGuestWorkspace && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>
              You're viewing <strong>{currentWorkspace.name}</strong> as{" "}
              {roleLabelFor(currentWorkspace.role)} — not your own workspace.
            </span>
          </div>
        )}

        <main className="flex-1 p-2 sm:p-6 min-w-0">
          <Outlet />
        </main>
      </div>

      {showModal && <CreateClusterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
