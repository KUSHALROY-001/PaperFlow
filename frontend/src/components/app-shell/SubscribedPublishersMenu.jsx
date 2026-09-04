import { useState } from "react";
import { UserCheck, Bookmark, Building2, ExternalLink, X } from "lucide-react";
import { useSubscriptions } from "@/lib/useSubscriptions";

export default function SubscribedPublishersMenu() {
  const [showSubscribedMenu, setShowSubscribedMenu] = useState(false);
  const { subscriptions, unsubscribe } = useSubscriptions();

  if (!subscriptions || subscriptions.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowSubscribedMenu((prev) => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all shrink-0"
        title="Subscribed Publishers"
      >
        <UserCheck className="w-4 h-4 text-orange-500" />
        <span className="hidden sm:inline">Subscribed</span>
        <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-extrabold">
          {subscriptions.length}
        </span>
      </button>

      {showSubscribedMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSubscribedMenu(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowSubscribedMenu(false);
            }}
            role="presentation"
          />
          <div className="absolute right-0 top-full mt-2 w-72 surface-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-orange-500" />
                Subscribed Publishers
              </h3>
              <span className="text-[10px] font-bold text-muted-foreground">
                {subscriptions.length} publisher
                {subscriptions.length !== 1 ? "s" : ""}
              </span>
            </div>

            {subscriptions.length === 0 ? (
              <div className="p-6 text-center">
                <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-foreground">
                  No subscriptions yet
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Click "Subscribe" on any publisher's mock test detail card to
                  follow them.
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.slug}
                    className="p-3 flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors group cursor-pointer"
                    onClick={() => {
                      setShowSubscribedMenu(false);
                      window.open(
                        `/catalog/${sub.slug}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setShowSubscribedMenu(false);
                        window.open(
                          `/catalog/${sub.slug}`,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-orange-500 transition-colors">
                        {sub.workspaceName || sub.slug}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        @{sub.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          unsubscribe(sub.slug);
                        }}
                        className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Unsubscribe"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
