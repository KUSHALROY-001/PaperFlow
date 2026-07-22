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
        const target = `${cluster.name} ${cluster.description || ""}`.toLowerCase();
        return (
          !search ||
          target.includes(search.toLowerCase())
        );
      }),
    [clusters, search],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Clusters Library
          </h1>
          <p className="text-muted-foreground mt-1">
            {clusters.length} cluster{clusters.length !== 1 ? "s" : ""} /{" "}
            {totalMockTests} mock test{totalMockTests !== 1 ? "s" : ""}
          </p>
          {isLoading && (
            <p className="text-xs text-muted-foreground mt-1">Loading...</p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex w-full items-center justify-center gap-2 px-5 py-3 gradient-violet text-white font-semibold rounded-xl shadow-lg shadow-violet-200 hover:opacity-90 transition-all sm:w-auto"
        >
          <Plus className="w-4 h-4" /> New Cluster
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clusters..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto bg-card border border-border rounded-xl p-1">
          <button
            onClick={() => setView("grid")}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              view === "grid"
                ? "gradient-violet text-white"
                : "text-muted-foreground hover:text-violet-600"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              view === "list"
                ? "gradient-violet text-white"
                : "text-muted-foreground hover:text-violet-600"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-medium text-red-700">
          {error.message}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="card-lavender rounded-2xl p-12 text-center">
          <FolderOpen className="w-10 h-10 text-violet-300 mx-auto mb-3" />
          <p className="text-muted-foreground">
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
                className="card-lavender rounded-2xl p-5 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-violet-600" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-semibold">
                    <FileText className="w-3 h-3" />
                    {mockTestCount} mock test{mockTestCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <h3 className="font-bold text-foreground mb-1 truncate">
                  {cluster.name}
                </h3>
                {cluster.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {cluster.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />{" "}
                    {formatTimeAgo(cluster.created_at)}
                  </span>
                  <Link
                    to={`/cluster/${cluster.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 gradient-violet text-white font-semibold rounded-lg text-xs hover:opacity-90 transition-all shadow-sm shadow-violet-200"
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
        <div className="card-lavender rounded-2xl overflow-x-auto">
          <div className="grid min-w-[40rem] grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-violet-50 border-b border-violet-100 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
                className="grid min-w-[40rem] grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 border-b border-violet-50 hover:bg-violet-50/50 transition-colors last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4 text-violet-600" />
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
                <span className="text-sm text-muted-foreground">
                  {mockTestCount}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatTimeAgo(cluster.created_at)}
                </span>
                <Link
                  to={`/cluster/${cluster.id}`}
                  className="flex items-center gap-1 px-3 py-1.5 gradient-violet text-white font-semibold rounded-lg text-xs hover:opacity-90 transition-all shadow-sm shadow-violet-200"
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
