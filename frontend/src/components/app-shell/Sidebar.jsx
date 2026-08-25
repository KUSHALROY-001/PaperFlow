import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Users, X, Info } from "lucide-react";
import MockCraftLogo from "./MockCraftLogo";
import { navSections } from "./navConfig";

export default function Sidebar({
  location,
  onNavigate,
  onCreateCluster,
  badges = {},
}) {
  const navigate = useNavigate();

  const [isInviteCardDismissed, setIsInviteCardDismissed] = useState(() => {
    return (
      localStorage.getItem("paperflow_dismiss_invite_team_card") === "true"
    );
  });

  const handleDismissInviteCard = () => {
    localStorage.setItem("paperflow_dismiss_invite_team_card", "true");
    setIsInviteCardDismissed(true);
  };

  const handleShowInfo = (event, to) => {
    // Not nested inside the Link below (a <button> inside an <a> is
    // invalid HTML and unreliable to click in some browsers) - a
    // sibling instead, so no stopPropagation/preventDefault interaction
    // with the Link's own navigation is needed here at all.
    //
    // ?showInfo=1 rather than clearing localStorage directly here: the
    // target page's own intro card (see StudentsIntroCard.jsx) needs to
    // react to this even when it's already mounted (clicking this while
    // already on /students navigates to the same route, which doesn't
    // remount anything) - a URL param change is what it can actually
    // observe reactively; a plain localStorage write from over here
    // wouldn't be.
    navigate(`${to}?showInfo=1`);
    onNavigate?.();
  };
  return (
    <>
      <div className="h-16 p-4 border-b border-border">
        <Link to="/" onClick={onNavigate}>
          <MockCraftLogo />
        </Link>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto scrollbar-hidden">
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
                    location.pathname.startsWith("/cluster/")) ||
                  (item.to === "/students" &&
                    location.pathname.startsWith("/students/"));
                const badgeCount = badges[item.to];
                return (
                  <div key={item.to} className="flex items-center gap-1">
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={`flex-1 flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all min-w-0 ${
                        active
                          ? "text-orange-500 dark:text-orange-500 font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <item.icon
                        className={`w-4 h-4 shrink-0 ${active ? "text-orange-500" : ""}`}
                      />
                      <span className="truncate">{item.label}</span>
                      {Boolean(badgeCount) && (
                        <span
                          className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            active
                              ? "bg-orange-500 text-white"
                              : "bg-muted-foreground/20 text-muted-foreground"
                          }`}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </Link>
                    {item.hasInfo && (
                      <button
                        type="button"
                        onClick={(event) => handleShowInfo(event, item.to)}
                        title={`What is the ${item.label} page?`}
                        className="flex mr-2 h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-colors shrink-0"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Invite team card */}
        {!isInviteCardDismissed && (
          <div className="pt-2">
            <div className="relative surface-card rounded-2xl p-4 border border-border space-y-3">
              <button
                type="button"
                onClick={handleDismissInviteCard}
                title="Dismiss"
                aria-label="Dismiss team invite card"
                className="absolute top-3 right-3 h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
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
        )}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={onCreateCluster}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-md shadow-sm transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> New Cluster
        </button>
      </div>
    </>
  );
}
