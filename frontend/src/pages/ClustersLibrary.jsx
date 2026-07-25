import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock,
  FileText,
  FolderOpen,
  Grid3X3,
  List,
  Plus,
  Search,
} from "lucide-react";
import CreateClusterModal from "../components/CreateClusterModal";
import { api } from "@/lib/api";

function formatTimeAgo(dateStr) {
  if (!dateStr) return "-";

  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ClustersLibrary() {
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["clusters"],
    queryFn: api.listClusters,
  });

  const clusters = useMemo(() => data?.clusters || [], [data]);

  const totalMockTests = useMemo(
    () =>
      clusters.reduce(
        (total, cluster) => total + Number(cluster.mock_test_count || 0),
        0,
      ),
    [clusters],
  );

  const filtered = useMemo(
    () =>
      clusters.filter((cluster) => {
        const target =
          `${cluster.name} ${cluster.description || ""}`.toLowerCase();
        return !search || target.includes(search.toLowerCase());
      }),
    [clusters, search],
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Clusters Library
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {clusters.length} cluster{clusters.length !== 1 ? "s" : ""} /{" "}
            {totalMockTests} mock test{totalMockTests !== 1 ? "s" : ""}
          </p>
          {isLoading && (
            <p className="text-xs text-muted-foreground mt-1">
              Loading clusters...
            </p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl text-sm shadow-sm transition-all sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4" /> New Cluster
        </button>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full min-w-0 sm:flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clusters..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1 self-end surface-card border border-border rounded-xl p-1 sm:ml-auto sm:self-auto">
          <button
            onClick={() => setView("grid")}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              view === "grid"
                ? "bg-[#ea580c] text-white font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              view === "list"
                ? "bg-[#ea580c] text-white font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-500">
          {error.message}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="surface-card rounded-2xl p-12 text-center border border-border">
          <FolderOpen className="w-10 h-10 text-orange-500/60 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">
            No clusters match your search
          </p>
        </div>
      )}

      {view === "grid" && filtered.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cluster) => {
            const mockTestCount = Number(cluster.mock_test_count || 0);

            return (
              <div
                key={cluster.id}
                className="surface-card rounded-2xl p-5 border border-border hover:border-orange-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-orange-500/15 rounded-xl flex items-center justify-center text-orange-500">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs bg-purple-500/15 text-purple-400 dark:text-purple-300 px-2.5 py-1 rounded-full font-semibold">
                      <FileText className="w-3 h-3" />
                      {mockTestCount} mock test{mockTestCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground mb-1 truncate text-base">
                    {cluster.name}
                  </h3>
                  {cluster.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {cluster.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />{" "}
                    {formatTimeAgo(cluster.created_at)}
                  </span>
                  <Link
                    to={`/cluster/${cluster.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-500 border border-orange-500/30 hover:bg-orange-500/10 rounded-lg transition-colors"
                  >
                    Open <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && filtered.length > 0 && (
        <div className="surface-card rounded-2xl overflow-x-auto border border-border">
          <div className="grid min-w-[40rem] grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-muted/40 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wide">
            <span>Cluster</span>
            <span>Mock Tests</span>
            <span>Created</span>
            <span></span>
          </div>
          {filtered.map((cluster) => {
            const mockTestCount = Number(cluster.mock_test_count || 0);

            return (
              <div
                key={cluster.id}
                className="grid min-w-[40rem] grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 border-b border-border/50 hover:bg-muted/30 transition-colors last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-orange-500/15 text-orange-500 rounded-lg flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {cluster.name}
                    </p>
                    {cluster.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {cluster.description}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground font-medium">
                  {mockTestCount}
                </span>
                <span className="text-sm text-muted-foreground font-medium">
                  {formatTimeAgo(cluster.created_at)}
                </span>
                <Link
                  to={`/cluster/${cluster.id}`}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-500 border border-orange-500/30 hover:bg-orange-500/10 rounded-lg transition-colors"
                >
                  Open <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <CreateClusterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
