import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Sparkles, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function CreateClusterModal({ onClose, onCreated }) {
  const { isViewer } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await api.createCluster(form);
      await queryClient.invalidateQueries({ queryKey: ["clusters"] });
      onCreated?.(result.cluster);
      onClose();
      navigate(`/cluster/${result.cluster.id}`);
    } catch (err) {
      setError(err.message || "Could not create cluster");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8 backdrop-blur-xs sm:items-center">
      <div className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl surface-card border border-border shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md sm:bg-orange-500/15 text-orange-500">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Create New Cluster
              </h2>
              <p className="text-xs text-muted-foreground">
                Create a workspace for related mock tests
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6 overscroll-contain"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Cluster Name *
            </label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  name: event.target.value,
                }))
              }
              placeholder="e.g. JECA"
              className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              A cluster is just a container, like JECA, GATE, or Class 10
              Science.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  description: event.target.value,
                }))
              }
              placeholder="e.g. MCA entrance preparation workspace for PYQs and practice mocks"
              rows={3}
              className="w-full resize-none rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
            />
          </div>

          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
            <div className="flex gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Mock tests are created inside the cluster.
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  After creating this cluster, open it to add JECA PYQ 2024,
                  JECA PYQ 2023, JECA Mock Test 1, and more.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isViewer}
              title={
                isViewer
                  ? "Editor role is required to create clusters"
                  : undefined
              }
              className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white transition-all shadow-sm ${
                isViewer
                  ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Cluster</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
