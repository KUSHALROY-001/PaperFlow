import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  X,
  ChevronRight,
  FolderOpen,
  FileText,
  Library,
} from "lucide-react";
import { api } from "@/lib/api";

export default function GlobalHeaderSearch({ mobile = false }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const clustersQuery = useQuery({
    queryKey: ["header-search-clusters"],
    queryFn: api.listClusters,
    enabled: isOpen,
    staleTime: 30_000,
  });

  const mockTestsQuery = useQuery({
    queryKey: ["header-search-mock-tests"],
    queryFn: api.listAllMockTests,
    enabled: isOpen,
    staleTime: 30_000,
  });

  const templatesQuery = useQuery({
    queryKey: ["header-search-templates"],
    queryFn: api.listExtractionTemplates,
    enabled: isOpen,
    staleTime: 30_000,
  });

  const clusters = clustersQuery.data?.clusters || [];
  const mockTests = mockTestsQuery.data?.mockTests || [];
  const templates = templatesQuery.data?.templates || [];

  const cleanQuery = query.trim().toLowerCase();

  const clusterResults = cleanQuery
    ? clusters
        .filter((c) => c.name?.toLowerCase().includes(cleanQuery))
        .slice(0, 5)
    : [];

  const mockTestResults = cleanQuery
    ? mockTests
        .filter(
          (m) =>
            m.name?.toLowerCase().includes(cleanQuery) ||
            m.cluster_name?.toLowerCase().includes(cleanQuery),
        )
        .slice(0, 5)
    : [];

  const templateResults = cleanQuery
    ? templates
        .filter(
          (t) =>
            t.name?.toLowerCase().includes(cleanQuery) ||
            t.exam_body?.toLowerCase().includes(cleanQuery),
        )
        .slice(0, 5)
    : [];

  const hasResults =
    clusterResults.length > 0 ||
    mockTestResults.length > 0 ||
    templateResults.length > 0;

  const handleSelect = (to) => {
    setIsOpen(false);
    setQuery("");
    navigate(to);
  };

  return (
    <div
      className={
        mobile
          ? isOpen
            ? "fixed inset-y-0 left-14 right-0 z-40 overflow-y-auto bg-white p-4 dark:bg-card"
            : "relative"
          : "relative flex-1 max-w-md hidden sm:block"
      }
    >
      {mobile && !isOpen ? (
        <button
          type="button"
          aria-label="Open search"
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <Search className="w-5 h-5" />
        </button>
      ) : (
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            autoFocus={mobile && isOpen}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            placeholder="Search clusters, mocks, templates..."
            className="w-full pl-9 pr-20 py-2 text-xs sm:text-sm rounded-full border border-border bg-muted/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all text-foreground placeholder:text-muted-foreground"
          />

          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-10 p-1 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {mobile && isOpen ? (
            <button
              type="button"
              aria-label="Close search"
              onClick={() => {
                setIsOpen(false);
                setQuery("");
              }}
              className="absolute right-2 p-1 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <kbd className="absolute right-3 hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-card rounded border border-border pointer-events-none">
              ⌘ K
            </kbd>
          )}
        </div>
      )}

      {isOpen && (
        <div
          className={
            mobile
              ? "mt-4 w-full surface-card rounded-2xl border border-border shadow-2xl overflow-hidden"
              : "absolute left-0 top-full mt-2 w-full min-w-[320px] max-w-lg surface-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-150"
          }
        >
          {!cleanQuery ? (
            <div className="p-5 text-center text-xs text-muted-foreground">
              Type to search clusters, mock tests, and templates...
            </div>
          ) : !hasResults ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No matching results found for "
              <span className="text-foreground font-semibold">{query}</span>"
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-border p-2 space-y-2">
              {clusterResults.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Clusters
                  </p>
                  {clusterResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(`/cluster/${c.id}`)}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-left transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FolderOpen className="w-4 h-4 text-orange-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate group-hover:text-orange-500 transition-colors">
                            {c.name}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {mockTestResults.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Mock Tests
                  </p>
                  {mockTestResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        handleSelect(
                          m.cluster_id
                            ? `/cluster/${m.cluster_id}/mocktest/${m.id}`
                            : `/session/${m.id}`,
                        )
                      }
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-left transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate group-hover:text-orange-500 transition-colors">
                            {m.name}
                          </p>
                          {m.cluster_name && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {m.cluster_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {templateResults.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Templates
                  </p>
                  {templateResults.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelect("/templates")}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-left transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Library className="w-4 h-4 text-orange-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate group-hover:text-orange-500 transition-colors">
                            {t.name}
                          </p>
                          {t.exam_body && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {t.exam_body}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
