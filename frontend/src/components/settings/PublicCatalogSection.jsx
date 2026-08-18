import { useEffect, useState } from "react";
import { Globe, Loader2, Save } from "lucide-react";
import { api } from "@/lib/api";

// Self-contained rather than routed through useSettings.js - that hook is
// entirely user-profile state (name, email, password, preferences); a
// workspace's public catalog address is a different concern (workspace-
// level, not user-level) and doesn't share any of that hook's existing
// fields or save flow.
export default function PublicCatalogSection() {
  const [slug, setSlug] = useState("");
  const [savedSlug, setSavedSlug] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getWorkspace()
      .then(({ workspace }) => {
        if (cancelled) return;
        setSlug(workspace.public_slug || "");
        setSavedSlug(workspace.public_slug || null);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSaved(false);
    setIsSaving(true);
    try {
      const { workspace } = await api.updateWorkspaceSlug(slug.trim() || null);
      setSavedSlug(workspace.public_slug || null);
      setSlug(workspace.public_slug || "");
      setSaved(true);
    } catch (err) {
      setError(err.message || "Could not save catalog address");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="surface-card rounded-2xl p-5 sm:p-6 border border-border flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="surface-card rounded-2xl p-5 sm:p-6 border border-border"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center">
          <Globe className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Public Catalog</h2>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground mb-5">
        Set an address to let anyone browse and take your published tests
        that you've chosen to list, without needing a share link. Tests are
        only visible here once you turn on "List in public catalog" for
        them individually (see the Share panel on a published test).
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Catalog address
        </label>
        <div className="flex items-center rounded-xl border border-border bg-card overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/30">
          <span className="pl-3 pr-1 text-sm text-muted-foreground shrink-0">
            /catalog/
          </span>
          <input
            type="text"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="jeca-coaching"
            className="flex-1 min-w-0 py-2 pr-3 bg-transparent text-sm text-foreground focus:outline-none"
          />
        </div>
        {savedSlug && (
          <p className="text-xs text-muted-foreground">
            Live at <span className="font-semibold">/catalog/{savedSlug}</span>
          </p>
        )}
      </div>

      {error && (
        <p className="mt-3 text-xs font-bold text-red-500">{error}</p>
      )}
      {saved && !error && (
        <p className="mt-3 text-xs font-bold text-emerald-500">Saved.</p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm font-bold shadow-xs transition-all disabled:opacity-50"
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        Save
      </button>
    </form>
  );
}
