import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Edit2,
  FileText,
  FolderOpen,
  Plus,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";

const statusConfig = {
  published: {
    color: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    dot: "bg-emerald-500",
    label: "Ready",
  },
  review: {
    color: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    dot: "bg-amber-500",
    label: "Needs Review",
  },
  processing: {
    color: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
    dot: "bg-blue-500 animate-pulse",
    label: "Processing",
  },
  draft: {
    color: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
    label: "Draft",
  },
  archived: {
    color: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
    label: "Archived",
  },
};

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

export default function ClusterWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [actionError, setActionError] = useState("");

  const { data: clusterData, isLoading } = useQuery({
    queryKey: ["cluster", id],
    queryFn: () => api.getCluster(id),
  });

  const { data: mockTestsData } = useQuery({
    queryKey: ["mock-tests", id],
    queryFn: () => api.listMockTests(id),
    enabled: Boolean(id),
  });

  const cluster = clusterData?.cluster;
  const mocktests = mockTestsData?.mockTests || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="text-center py-20">
        <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">
          Cluster not found
        </h2>
      </div>
    );
  }

  const handleDeleteCluster = async () => {
    if (!confirm("Delete this cluster and all its mock tests?")) return;

    try {
      await api.deleteCluster(cluster.id);
      await queryClient.invalidateQueries({ queryKey: ["clusters"] });
      navigate("/clusters");
    } catch (error) {
      setActionError(error.message || "Could not delete cluster");
    }
  };

  const handleSaveEdit = async () => {
    try {
      await api.updateCluster(cluster.id, {
        name: editForm.name,
        description: editForm.description,
      });
      await queryClient.invalidateQueries({ queryKey: ["cluster", id] });
      await queryClient.invalidateQueries({ queryKey: ["clusters"] });
      setEditing(false);
      setActionError("");
    } catch (error) {
      setActionError(error.message || "Could not update cluster");
    }
  };

  const startEdit = () => {
    setEditForm({
      name: cluster.name,
      description: cluster.description || "",
    });
    setEditing(true);
  };

  const processingCount = mocktests.filter(
    (mocktest) => mocktest.status === "processing",
  ).length;
  const readyCount = mocktests.filter(
    (mocktest) => mocktest.status === "published",
  ).length;
  const reviewCount = mocktests.filter(
    (mocktest) => mocktest.status === "review",
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="surface-card rounded-2xl p-6 border border-border">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 bg-orange-500/15 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
              <FolderOpen className="w-6 h-6" />
            </div>
            {editing ? (
              <div className="flex-1 space-y-2">
                <input
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((form) => ({
                      ...form,
                      name: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((form) => ({
                      ...form,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Description..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none text-foreground"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold rounded-xl"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-1.5 border border-border text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                  {cluster.name}
                </h1>
                {cluster.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {cluster.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  {mocktests.length} mock test
                  {mocktests.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
          {!editing && (
            <div className="flex items-center gap-2">
              <button
                onClick={startEdit}
                className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-orange-500/40 transition-all"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeleteCluster}
                className="w-9 h-9 rounded-xl border border-red-500/20 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500/40 transition-all"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {actionError && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
            {actionError}
          </div>
        )}

        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Total Mock Tests",
              value: mocktests.length,
              icon: FileText,
              color: "text-orange-500 bg-orange-500/15",
            },
            {
              label: "Processing",
              value: processingCount,
              icon: Zap,
              color: "text-blue-500 bg-blue-500/15",
            },
            {
              label: "Needs Review",
              value: reviewCount,
              icon: AlertTriangle,
              color: "text-amber-500 bg-amber-500/15",
            },
            {
              label: "Ready",
              value: readyCount,
              icon: CheckCircle,
              color: "text-emerald-500 bg-emerald-500/15",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="surface-card rounded-xl p-3.5 border border-border flex items-center gap-3"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.color} shrink-0`}
              >
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">Mock Tests</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition-all w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Add Mock Test
        </button>
      </div>

      {mocktests.length === 0 ? (
        <div className="surface-card rounded-2xl p-12 text-center border border-border">
          <FileText className="w-10 h-10 text-orange-500/60 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground mb-1">
            No mock tests yet
          </h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
            Upload a PDF or create a manual mock test in this cluster.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl text-xs shadow-sm transition-all"
          >
            Add Mock Test
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mocktests.map((mocktest) => {
            const status = statusConfig[mocktest.status] || statusConfig.draft;
            const isProcessing = mocktest.status === "processing";

            return (
              <div
                key={mocktest.id}
                className="surface-card rounded-2xl p-5 border border-border hover:border-orange-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${status.dot}`}
                      />
                      {status.label}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground mb-1 truncate text-base">
                    {mocktest.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {mocktest.description || "Manual mock test"}
                    </span>
                  </div>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {mocktest.exam_year && (
                      <span className="text-xs bg-orange-500/10 text-orange-500 font-semibold px-2 py-0.5 rounded-lg border border-orange-500/20">
                        {mocktest.exam_year}
                      </span>
                    )}
                    {Number(mocktest.total_questions) > 0 && (
                      <span className="text-xs bg-purple-500/15 text-purple-400 dark:text-purple-300 font-semibold px-2 py-0.5 rounded-lg">
                        {mocktest.total_questions} Q
                      </span>
                    )}
                  </div>
                  {isProcessing && (
                    <div className="mb-3">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-orange-500 animate-pulse"
                          style={{ width: "60%" }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />{" "}
                    {formatTimeAgo(mocktest.created_at)}
                  </span>
                  <Link
                    to={`/cluster/${id}/mocktest/${mocktest.id}`}
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

      {showModal && (
        <CreateMockTestModal
          clusterId={id}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function CreateMockTestModal({ clusterId, onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    description: "",
    durationMinutes: 120,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await api.createMockTest(clusterId, {
        name: form.name,
        description: form.description,
        durationMinutes: Number(form.durationMinutes),
      });

      if (selectedFile) {
        await api.uploadMockTestDocument(result.mockTest.id, selectedFile);
      }

      await queryClient.invalidateQueries({
        queryKey: ["mock-tests", clusterId],
      });
      await queryClient.invalidateQueries({ queryKey: ["clusters"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      onClose();
      navigate(
        `/cluster/${clusterId}/mocktest/${result.mockTest.id}?tab=${selectedFile ? "processing" : "overview"}`,
      );
    } catch (submitError) {
      setError(submitError.message || "Could not create mock test");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl surface-card border border-border shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Add Mock Test</h2>
            <p className="text-xs text-muted-foreground">
              Create a mock test inside this cluster.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Mock Test Name *
            </label>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="e.g. JECA PYQ 2024"
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={3}
              placeholder="Optional notes for this mock test"
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Duration Minutes
            </label>
            <input
              type="number"
              min="1"
              value={form.durationMinutes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  durationMinutes: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Upload Document
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40 px-4 py-6 text-center transition-all hover:border-orange-500/40 hover:bg-muted">
              <Upload className="mb-3 h-6 w-6 text-orange-500" />
              <span className="max-w-full break-all text-sm font-semibold text-foreground">
                {selectedFile ? selectedFile.name : "Choose PDF document"}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                PDF upload processing will be connected in the OCR pipeline
                step.
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setSelectedFile(file);
                  if (file && !form.name.trim()) {
                    setForm((current) => ({
                      ...current,
                      name: file.name.replace(/\.pdf$/i, ""),
                    }));
                  }
                }}
              />
            </label>
            {selectedFile && (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                <span className="truncate">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="font-semibold text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-60 shadow-sm"
            >
              {isSubmitting ? "Creating..." : "Add Mock Test"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
