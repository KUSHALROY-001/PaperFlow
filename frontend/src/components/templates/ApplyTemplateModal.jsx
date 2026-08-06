import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function ApplyTemplateModal({ template, onClose, onApplied }) {
  const { isViewer } = useAuth();
  const { data, isLoading: clustersLoading } = useQuery({
    queryKey: ["clusters"],
    queryFn: api.listClusters,
  });
  const clusters = data?.clusters || [];

  const [clusterId, setClusterId] = useState("");
  const [name, setName] = useState(template.name);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isViewer) return;

    if (!clusterId) {
      setError("Choose a cluster to apply this template to");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const result = await api.applyExtractionTemplate(template.id, {
        clusterId,
        name,
      });
      onApplied(clusterId, result.mockTest.id);
    } catch (submitError) {
      setError(submitError.message || "Could not apply template");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md surface-card border border-border rounded-3xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-foreground">
          Apply "{template.name}"
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-4">
          Creates a new mock test pre-filled with this template's marking scheme
          and sections.
        </p>

        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
          Mock test name
        </label>
        <input
          disabled={isViewer}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full px-3 py-2 mb-4 text-sm rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
            isViewer ? "cursor-not-allowed opacity-60" : ""
          }`}
        />

        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
          Cluster
        </label>
        {clustersLoading ? (
          <p className="text-xs text-muted-foreground mb-4">
            Loading clusters...
          </p>
        ) : clusters.length === 0 ? (
          <p className="text-xs text-amber-500 mb-4">
            You need a cluster first — create one from the Clusters page.
          </p>
        ) : (
          <select
            disabled={isViewer}
            value={clusterId}
            onChange={(e) => setClusterId(e.target.value)}
            className={`w-full px-3 py-2 mb-4 text-sm rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
              isViewer ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <option value="">Select a cluster...</option>
            {clusters.map((cluster) => (
              <option key={cluster.id} value={cluster.id}>
                {cluster.name}
              </option>
            ))}
          </select>
        )}

        {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-border bg-card text-foreground font-semibold rounded-xl hover:bg-muted text-xs sm:text-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || clusters.length === 0 || isViewer}
            title={
              isViewer ? "Editor role is required to apply templates" : undefined
            }
            className={`flex-1 py-2.5 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              isViewer
                ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50 border border-border"
                : "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20"
            }`}
          >
            {isSubmitting ? (
              "Applying..."
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-orange-500" /> Confirm &
                Apply
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
