import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { GraduationCap, AlertTriangle } from "lucide-react";
import CatalogBrowser from "@/components/catalog/CatalogBrowser";

// Two distinct, single-purpose pages sharing one component - never a
// toggle between them. /catalog/:slug is the dedicated link an institute
// actually shares (flyers, WhatsApp, printed on a handout) - a student
// who followed it wants that institute's tests, full stop, not an
// invitation to go discover other institutes on the same page. /catalog
// (no slug) is the separate, genuinely cross-institute discovery page for
// a student with no specific institute in mind. Which one renders is
// decided once, by whether :slug is present - not by anything the
// student clicks. All the actual search/filter/grid/start-test logic
// lives in CatalogBrowser, shared with CatalogSettings.jsx's "Public
// Mock Tests" tab.
export default function PublicCatalog() {
  const { slug } = useParams();
  const isInstituteMode = Boolean(slug);

  const [workspaceName, setWorkspaceName] = useState(null);
  const [notFound, setNotFound] = useState(false);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-2.5">
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
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <CatalogBrowser
          slug={slug}
          onWorkspaceName={handleWorkspaceName}
          onError={handleError}
        />
      </main>
    </div>
  );
}
