import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Settings, LogOut, ChevronRight, Headphones } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import UserAvatar from "@/components/shared/UserAvatar";

export default function UserMenu() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Was AppShell's own route-change effect (it reset both mobileNavOpen
  // and showUserMenu together) - now scoped to just this component, since
  // this is the only state that lived here.
  useEffect(() => {
    setShowUserMenu(false);
  }, [location.pathname]);

  const userName = user?.name ? user.name.split(" ")[0] : "User";

  return (
    <div className="relative">
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-3xl border border-border bg-card hover:bg-muted transition-all"
      >
        <UserAvatar
          src={user?.avatarUrl}
          name={user?.name}
          seed={user?.id || user?.email}
          size="sm"
        />
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
          <div className="h-px bg-border my-1" />
          <Link
            to="/contact"
            onClick={() => setShowUserMenu(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <Headphones className="w-4 h-4 text-orange-500" /> Contact Us
          </Link>
        </div>
      )}
    </div>
  );
}
