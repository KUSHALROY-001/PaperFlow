import { useId, useState } from "react";
import { GraduationCap, X } from "lucide-react";

export default function NewCohortModal({ onClose, onCreate, isCreating }) {
  const uid = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      await onCreate(name.trim());
      onClose();
    } catch (err) {
      setError(err.message || "Could not create cohort");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8 backdrop-blur-xs sm:items-center">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl surface-card border border-border shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                New Cohort
              </h2>
              <p className="text-xs text-muted-foreground">
                Group students into a named batch
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

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <label
              htmlFor={`${uid}-cohort-name`}
              className="block text-xs sm:text-sm font-bold text-foreground mb-2"
            >
              Cohort Name
            </label>
            <input
              id={`${uid}-cohort-name`}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. JECA 2026 Batch A"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs transition-all disabled:opacity-50"
            >
              {isCreating ? "Creating…" : "Create Cohort"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
