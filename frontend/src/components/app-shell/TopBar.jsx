import { Link } from "react-router-dom";
import { Menu, ClipboardList, Bell } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import WorkspaceSwitcher from "../WorkspaceSwitcher";
import GlobalHeaderSearch from "./GlobalHeaderSearch";
import SubscribedPublishersMenu from "./SubscribedPublishersMenu";
import UserMenu from "./UserMenu";

export default function TopBar({ location, onOpenMobileNav, pendingInviteCount }) {
  return (
    <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-30">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenMobileNav}
        className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground lg:hidden shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      <GlobalHeaderSearch />

      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        <SubscribedPublishersMenu />
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

        <UserMenu />
      </div>
    </header>
  );
}
