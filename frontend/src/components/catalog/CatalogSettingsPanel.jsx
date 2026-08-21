import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, ExternalLink, FileText, Play } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import MockTestDetailModal from "./MockTestDetailModal";

import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonRowList } from "@/components/ui/skeleton-row";

const PUBLIC_ORIGIN = window.location.origin;

export default function CatalogSettingsPanel() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isViewer } = useAuth();

  const [slugInput, setSlugInput] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugError, setSlugError] = useState(null);
  const [savingSlug, setSavingSlug] = useState(false);
  const [copied, setCopied] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [detailMockTestId, setDetailMockTestId] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["workspace-catalog-settings"],
    queryFn: api.getWorkspaceCatalogSettings,
  });

  const settings = data?.settings;
  const currentSlug = slugTouched ? slugInput : settings?.public_slug || "";
  const publicUrl = settings?.public_slug
    ? `${PUBLIC_ORIGIN}/catalog/${settings.public_slug}`
    : null;
  const ownMockTests = settings?.mockTests || [];

  const handleSaveSlug = async (event) => {
    event.preventDefault();
    setSlugError(null);
    setSavingSlug(true);
    try {
      await api.updateWorkspacePublicSlug(currentSlug);
      setSlugTouched(false);
      await queryClient.invalidateQueries({
        queryKey: ["workspace-catalog-settings"],
      });
    } catch (err) {
      setSlugError(err.message || "Couldn't save that slug");
    } finally {
      setSavingSlug(false);
    }
  };

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleListed = async (mockTest) => {
    if (isViewer || mockTest.status !== "published") return;
    setTogglingId(mockTest.id);
    try {
      await api.updateMockTest(mockTest.id, {
        isCatalogListed: !mockTest.is_catalog_listed,
      });
      await queryClient.invalidateQueries({
        queryKey: ["workspace-catalog-settings"],
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleStartOwn = (mockTestId) => {
    navigate(`/session/${mockTestId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl flex flex-col mx-auto">
        <div className="surface-card rounded-2xl p-5 border border-border space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="surface-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-64" />
          </div>
          <SkeletonRowList count={4} className="border-0 rounded-none bg-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-card rounded-2xl p-6 border border-border text-sm text-red-500">
        Couldn't load catalog settings: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl flex flex-col mx-auto">
      {/* Slug / public URL */}
      <div className="surface-card rounded-2xl p-5 border border-border space-y-3">
        <h2 className="text-sm font-bold text-foreground">
          Your public catalog address
        </h2>
        {settings?.public_slug ? (
          <div className="flex items-center gap-2">
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted/40 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <span className="truncate">{publicUrl}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Copy link"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Not set yet - pick an address below to turn your catalog on.
          </p>
        )}

        {!isViewer && (
          <form
            onSubmit={handleSaveSlug}
            className="flex items-start gap-2 pt-1"
          >
            <div className="flex-1">
              <div className="flex items-center rounded-xl border border-border bg-card overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/30">
                <span className="pl-3 pr-1 text-xs text-muted-foreground shrink-0">
                  /catalog/
                </span>
                <input
                  type="text"
                  value={currentSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlugInput(e.target.value.toLowerCase());
                  }}
                  placeholder="jeca-coaching"
                  className="flex-1 min-w-0 py-2 pr-3 text-sm bg-transparent focus:outline-none text-foreground"
                />
              </div>
              {slugError && (
                <p className="text-xs text-red-500 mt-1">{slugError}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingSlug || !currentSlug}
              className="shrink-0 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {settings?.public_slug ? "Update" : "Activate"}
            </button>
          </form>
        )}
      </div>

      {/* Per-test listing */}
      <div className="surface-card rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">
            Tests in your catalog
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Only published tests can be listed. Hover a test to start it or
            change whether it's public.
          </p>
        </div>

        {ownMockTests.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No mock tests yet - create one from a cluster first.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {ownMockTests.map((mockTest) => {
              const canList = mockTest.status === "published";
              return (
                <div
                  key={mockTest.id}
                  onClick={() => setDetailMockTestId(mockTest.id)}
                  role="button"
                  tabIndex={0}
                  className="group flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {mockTest.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {mockTest.cluster_name}
                      {mockTest.exam_year
                        ? ` · ${mockTest.exam_year}`
                        : ""} · {mockTest.total_questions} questions
                      {!canList && " · not published yet"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleStartOwn(mockTest.id);
                    }}
                    title="Start this test"
                    className="shrink-0 h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-emerald-500 hover:border-emerald-500/40 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>

                  <div className="shrink-0 relative h-6 w-11">
                    <span
                      className={`absolute inset-0 flex items-center justify-center rounded-full text-[9px] font-bold transition-opacity group-hover:opacity-0 ${
                        mockTest.is_catalog_listed
                          ? "bg-orange-500/15 text-orange-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {mockTest.is_catalog_listed ? "Public" : "Private"}
                    </span>
                    <button
                      type="button"
                      disabled={
                        isViewer || !canList || togglingId === mockTest.id
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        handleToggleListed(mockTest);
                      }}
                      title={
                        !canList
                          ? "Publish this test before listing it in the catalog"
                          : mockTest.is_catalog_listed
                            ? "Remove from public catalog"
                            : "List in public catalog"
                      }
                      className={`absolute inset-0 opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex h-6 w-11 items-center rounded-full transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${
                        mockTest.is_catalog_listed
                          ? "bg-orange-500"
                          : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          mockTest.is_catalog_listed
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {detailMockTestId && (
        <MockTestDetailModal
          mockTestId={detailMockTestId}
          isPublic={false}
          onClose={() => setDetailMockTestId(null)}
        />
      )}
    </div>
  );
}
