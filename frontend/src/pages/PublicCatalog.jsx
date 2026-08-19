import { useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  AlertTriangle,
  UserCheck,
  Building2,
  Bookmark,
  ExternalLink,
  X,
} from "lucide-react";
import CatalogBrowser from "@/components/catalog/CatalogBrowser";
import { useSubscriptions } from "@/lib/useSubscriptions";

// Two distinct, single-purpose pages sharing one component - never a
// toggle between them. /catalog/:slug is the dedicated link an institute
// actually shares (flyers, WhatsApp, printed on a handout) - a student
// who followed it wants that institute's tests, full stop, not an
// invitation to go discover other institutes on the same page. /catalog
// (no slug) is the separate, genuinely cross-institute discovery page for
// a student with no specific institute in mind. Which one renders is
// decided once, by whether :slug is present - not by anything the
// student clicks. All the actual search/filter/grid/start-test logic
// lives in CatalogBrowser, shared with PublicMockTests.jsx's "Public
// Mock Tests" tab.
export default function PublicCatalog() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isInstituteMode = Boolean(slug);

  const [workspaceName, setWorkspaceName] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [showSubscribedMenu, setShowSubscribedMenu] = useState(false);

  const { subscriptions, unsubscribe } = useSubscriptions();

  const handleWorkspaceName = useCallback((name) => setWorkspaceName(name), []);
  const handleError = useCallback(() => setNotFound(true), []);

  if (isInstituteMode && notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-foreground">
            Catalog not found
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            There's no public test catalog at this address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center text-[#ea580c] shrink-0">
              <GraduationCap className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-foreground truncate">
                {isInstituteMode
                  ? workspaceName || "Mock Test Catalog"
                  : "Public Mock Test Catalog"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isInstituteMode
                  ? "Free practice mock tests"
                  : "Free practice tests from every institute on PaperFlow"}
              </p>
            </div>
          </div>

          {/* Subscribed button & Dropdown - shown only when there are active subscriptions */}
          {subscriptions.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSubscribedMenu((prev) => !prev)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-all shadow-sm"
              >
                <UserCheck className="w-4 h-4 text-orange-500" />
                <span>Subscribed</span>
                <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-extrabold">
                  {subscriptions.length}
                </span>
              </button>

              {showSubscribedMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowSubscribedMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 surface-card rounded-2xl border border-border shadow-2xl z-30 overflow-hidden animate-in zoom-in-95 duration-150">
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
                          Click "Subscribe" on any publisher's mock test detail
                          card to follow them.
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
                              window.open(`/catalog/${sub.slug}`, "_blank", "noopener,noreferrer");
                            }}
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
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <CatalogBrowser
          slug={slug}
          showSubscriberFilter={false}
          onWorkspaceName={handleWorkspaceName}
          onError={handleError}
        />
      </main>
    </div>
  );
}
