import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderOpen,
  Grid3X3,
  List,
  Search,
  ArrowRight,
  Clock,
  Plus,
  ClipboardList,
  CheckCircle,
} from "lucide-react";
import CreateClusterModal from "../components/CreateClusterModal";

const allClusters = [
  {
    id: "c1",
    name: "JECA",
    description: "MCA entrance preparation workspace for PYQs and practice mocks.",
    mockTests: 4,
    ready: 2,
    processing: 1,
    review: 1,
    updated: "2 hours ago",
    recentMocks: ["JECA PYQ 2024", "JECA PYQ 2023", "JECA Mock Test 1"],
  },
  {
    id: "c2",
    name: "GATE CS",
    description: "Subject-wise GATE computer science mocks and previous papers.",
    mockTests: 3,
    ready: 1,
    processing: 1,
    review: 1,
    updated: "12 min ago",
    recentMocks: ["GATE CS 2023", "Data Structures PYQ", "Algorithms Mock"],
  },
  {
    id: "c3",
    name: "Operating Systems",
    description: "Unit notes, chapter tests, and OS revision mocks.",
    mockTests: 2,
    ready: 1,
    processing: 0,
    review: 1,
    updated: "1 day ago",
    recentMocks: ["OS Notes Unit 3", "Process Scheduling Quiz"],
  },
  {
    id: "c4",
    name: "Aptitude",
    description: "Quant, reasoning, and mixed aptitude test batches.",
    mockTests: 5,
    ready: 3,
    processing: 1,
    review: 1,
    updated: "34 min ago",
    recentMocks: ["Aptitude Mock Batch 1", "Reasoning Practice Set"],
  },
  {
    id: "c5",
    name: "Network Security",
    description: "Network security PYQs and short assessment sets.",
    mockTests: 1,
    ready: 1,
    processing: 0,
    review: 0,
    updated: "3 days ago",
    recentMocks: ["Network Security PYQ"],
  },
];

export default function ClustersLibrary() {
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = allClusters.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.recentMocks.some((mock) =>
        mock.toLowerCase().includes(search.toLowerCase()),
      );
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Clusters Library
          </h1>
          <p className="text-muted-foreground mt-1">
            {allClusters.length} clusters total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 gradient-violet text-white font-semibold rounded-xl shadow-lg shadow-violet-200 hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" /> New Cluster
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clusters..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto bg-card border border-border rounded-xl p-1">
          <button
            onClick={() => setView("grid")}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${view === "grid" ? "gradient-violet text-white" : "text-muted-foreground hover:text-violet-600"}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${view === "list" ? "gradient-violet text-white" : "text-muted-foreground hover:text-violet-600"}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid View */}
      {view === "grid" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cluster) => (
              <div
                key={cluster.id}
                className="card-lavender rounded-2xl p-5 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-violet-600" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                    <ClipboardList className="w-3 h-3" />
                    {cluster.mockTests} mocks
                  </span>
                </div>
                <h3 className="font-bold text-foreground mb-1 truncate">
                  {cluster.name}
                </h3>
                <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                  {cluster.description}
                </p>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-emerald-50 p-2 text-center">
                    <div className="text-base font-bold text-emerald-700">
                      {cluster.ready}
                    </div>
                    <div className="text-[11px] font-medium text-emerald-700">
                      Ready
                    </div>
                  </div>
                  <div className="rounded-xl bg-violet-50 p-2 text-center">
                    <div className="text-base font-bold text-violet-700">
                      {cluster.processing}
                    </div>
                    <div className="text-[11px] font-medium text-violet-700">
                      Running
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-2 text-center">
                    <div className="text-base font-bold text-amber-700">
                      {cluster.review}
                    </div>
                    <div className="text-[11px] font-medium text-amber-700">
                      Review
                    </div>
                  </div>
                </div>
                <div className="mb-4 space-y-1.5">
                  {cluster.recentMocks.slice(0, 3).map((mock) => (
                    <div
                      key={mock}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <ClipboardList className="h-3 w-3 text-violet-500" />
                      <span className="truncate">{mock}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> {cluster.updated}
                  </div>
                  <Link
                    to={`/cluster/${cluster.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 gradient-violet text-white font-semibold rounded-lg text-xs hover:opacity-90 transition-all shadow-sm shadow-violet-200"
                  >
                    Open <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="card-lavender rounded-2xl overflow-x-auto">
          <div className="grid min-w-[44rem] grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-violet-50 border-b border-violet-100 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Cluster</span>
            <span>Mock Tests</span>
            <span>Ready</span>
            <span>Updated</span>
            <span></span>
          </div>
          {filtered.map((cluster) => (
              <div
                key={cluster.id}
                className="grid min-w-[44rem] grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 border-b border-violet-50 hover:bg-violet-50/50 transition-colors last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {cluster.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {cluster.description}
                    </p>
                  </div>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                  <ClipboardList className="w-3 h-3" />
                  {cluster.mockTests}
                </span>
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  {cluster.ready} ready
                </span>
                <span className="text-sm text-muted-foreground">
                  {cluster.updated}
                </span>
                <Link
                  to={`/cluster/${cluster.id}`}
                  className="flex items-center gap-1 px-3 py-1.5 gradient-violet text-white font-semibold rounded-lg text-xs hover:opacity-90 transition-all shadow-sm shadow-violet-200"
                >
                  Open <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <FolderOpen className="w-10 h-10 text-violet-300 mx-auto mb-3" />
              <p className="text-muted-foreground">
                No clusters match your filters
              </p>
            </div>
          )}
        </div>
      )}

      {showModal && <CreateClusterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
