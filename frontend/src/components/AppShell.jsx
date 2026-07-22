import { useEffect, useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  Sparkles,
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
      { icon: Puzzle, label: "Integrations", to: "/integrations" },
      { icon: CreditCard, label: "Billing", to: "/billing" },
      { icon: Settings, label: "Settings", to: "/settings" },
    ],
  },
];

function SidebarContent({ location, onNavigate, onCreateCluster }) {
  return (
    <>
      <div className="p-5 sm:p-6 border-b border-border">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 gradient-violet rounded-lg flex items-center justify-center shadow-md shadow-violet-200">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">MockCraft</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-1">
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
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-primary"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {active && <ChevronRight className="w-3 h-3 ml-auto" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={onCreateCluster}
          className="w-full flex items-center justify-center gap-2 py-3 gradient-violet text-white font-semibold rounded-xl shadow-lg shadow-violet-200 hover:opacity-90 transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> New Cluster
        </button>
      </div>
    </>
  );
}

export default function AppShell() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  const openClusterModal = () => {
    setMobileNavOpen(false);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-background font-inter overflow-x-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col fixed h-full z-40">
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
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-[min(20rem,86vw)] flex-col bg-card border-r border-border shadow-2xl">
            <div className="absolute right-3 top-3">
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileNavOpen(false)}
                className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary"
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
      <div className="min-h-screen flex flex-col lg:ml-64">
        {/* Top bar */}
        <header className="min-h-16 bg-card border-b border-border flex items-center px-3 sm:px-4 lg:px-6 gap-2 sm:gap-4 sticky top-0 z-30">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
            className="h-10 w-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary lg:hidden shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden sm:block flex-1 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search clusters..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-input bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-all"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <Link
              to="/my-results"
              className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${location.pathname === "/my-results" ? "bg-secondary border-input text-secondary-foreground" : "border-border text-muted-foreground hover:text-primary hover:border-input hover:bg-secondary"}`}
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">My Results</span>
            </Link>
            <ThemeToggle />
            <button className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-input transition-all">
              <Bell className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:border-input transition-all"
              >
                <div className="w-6 h-6 gradient-violet rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-white" />
                </div>
                <span className="hidden sm:inline text-sm font-medium text-foreground">
                  {user?.name || "Account"}
                </span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 card-lavender rounded-2xl p-2 shadow-xl z-50">
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-primary hover:bg-secondary transition-all"
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 min-w-0">
          <Outlet />
        </main>
      </div>

      {showModal && <CreateClusterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
